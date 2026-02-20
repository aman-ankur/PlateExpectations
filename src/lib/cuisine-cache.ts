/**
 * Offline cuisine cache — fetches pre-generated dish data from static JSON,
 * stores in IndexedDB for offline access, and provides fuzzy matching
 * to instantly resolve dishes from Phase 1 scan results.
 */
import { Dish } from './types'

const DB_NAME = 'pe-cuisine-cache'
const DB_VERSION = 1
const STORE_NAME = 'cuisines'

// ─── IndexedDB helpers ───────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'cuisine' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

interface CachedCuisine {
  cuisine: string
  version: number
  dishes: CachedDish[]
  fetchedAt: number
}

export interface CachedDish extends Dish {
  matchKeys: string[]
  imageUrl?: string
  imageUrls?: string[]
  imageSource?: string
  imageVerified?: boolean
}

async function getFromIDB(cuisine: string): Promise<CachedCuisine | undefined> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(cuisine)
      req.onsuccess = () => resolve(req.result || undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

async function putToIDB(cuisine: string, version: number, dishes: CachedDish[]): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ cuisine, version, dishes, fetchedAt: Date.now() } satisfies CachedCuisine)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IndexedDB unavailable — fall through to network
  }
}

// ─── Fetch & cache cuisine data ──────────────────────────────────────

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Load a cuisine's cached dishes (from IDB or network). Returns [] on failure. */
async function loadCuisine(cuisine: string): Promise<CachedDish[]> {
  // Try IndexedDB first
  const cached = await getFromIDB(cuisine)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.dishes
  }

  // Fetch from static JSON
  try {
    const res = await fetch(`/cache/${cuisine}.json`)
    if (!res.ok) return cached?.dishes || []
    const data = await res.json()
    const dishes: CachedDish[] = data.dishes || []
    await putToIDB(cuisine, data.version || 1, dishes)
    return dishes
  } catch {
    return cached?.dishes || []
  }
}

// ─── Country → cuisine mapping ───────────────────────────────────────

const COUNTRY_TO_CUISINE: Record<string, string> = {
  'south korea': 'korean',
  'korea': 'korean',
  'japan': 'japanese',
  'thailand': 'thai',
  'vietnam': 'vietnamese',
  'malaysia': 'malaysian',
}

/** Detect cuisine from Phase 1 dish countries. Returns the most common cuisine slug or null. */
export function detectCuisine(countries: string[]): string | null {
  const counts: Record<string, number> = {}
  for (const c of countries) {
    const cuisine = COUNTRY_TO_CUISINE[c.toLowerCase()]
    if (cuisine) counts[cuisine] = (counts[cuisine] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? sorted[0][0] : null
}

// ─── Fuzzy matching ──────────────────────────────────────────────────

/** Normalize text for comparison: lowercase, strip Latin diacritics, trim. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip Latin combining diacritics
    .normalize('NFC')                  // recompose (Korean Jamo back to Hangul)
    .replace(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Try to match a Phase 1 dish name against cached dishes. */
function findMatch(
  nameEnglish: string,
  nameLocal: string,
  cachedDishes: CachedDish[],
): CachedDish | null {
  const normEn = normalize(nameEnglish)
  const normLocal = normalize(nameLocal)

  // Pass 1: exact match on matchKeys
  for (const cd of cachedDishes) {
    for (const key of cd.matchKeys) {
      const normKey = normalize(key)
      if (normKey === normEn || normKey === normLocal) return cd
    }
  }

  // Pass 2: exact match on nameEnglish/nameLocal/nameRomanized
  for (const cd of cachedDishes) {
    if (normalize(cd.nameEnglish) === normEn) return cd
    if (normalize(cd.nameLocal) === normLocal) return cd
    if (cd.nameRomanized && normalize(cd.nameRomanized) === normEn) return cd
  }

  // Pass 3: contains match (one contains the other)
  for (const cd of cachedDishes) {
    const cdEn = normalize(cd.nameEnglish)
    if (normEn.length >= 3 && (cdEn.includes(normEn) || normEn.includes(cdEn))) return cd
    if (cd.nameRomanized) {
      const cdRom = normalize(cd.nameRomanized)
      if (normEn.length >= 3 && (cdRom.includes(normEn) || normEn.includes(cdRom))) return cd
    }
  }

  // Pass 4: local script exact substring (for CJK/Korean/Thai)
  if (nameLocal && nameLocal.length >= 2) {
    for (const cd of cachedDishes) {
      if (cd.nameLocal && (cd.nameLocal.includes(nameLocal) || nameLocal.includes(cd.nameLocal))) {
        return cd
      }
    }
  }

  return null
}

// ─── Public API ──────────────────────────────────────────────────────

export interface CacheMatchResult {
  /** Dishes that matched the cache (fully enriched, ready to render) */
  hits: Dish[]
  /** Image URLs for cache hits: dishId → url[] */
  hitImages: Record<string, string[]>
  /** IDs of Phase 1 dishes that did NOT match (need LLM enrichment) */
  missIds: Set<string>
}

/**
 * Given Phase 1 raw dishes, attempt to match them against the offline cache.
 * Returns cache hits as fully enriched Dish objects (with original IDs and prices)
 * and a set of miss IDs that need normal LLM enrichment.
 */
export async function matchFromCache(
  rawDishes: { id: string; nameEnglish: string; nameLocal: string; price: string; country: string }[],
): Promise<CacheMatchResult> {
  const hits: Dish[] = []
  const hitImages: Record<string, string[]> = {}
  const missIds = new Set<string>()

  if (rawDishes.length === 0) return { hits, hitImages, missIds }

  // Detect cuisine
  const cuisine = detectCuisine(rawDishes.map((d) => d.country))
  if (!cuisine) {
    rawDishes.forEach((d) => missIds.add(d.id))
    return { hits, hitImages, missIds }
  }

  // Load cached dishes
  const cachedDishes = await loadCuisine(cuisine)
  if (cachedDishes.length === 0) {
    rawDishes.forEach((d) => missIds.add(d.id))
    return { hits, hitImages, missIds }
  }

  const usedCacheIds = new Set<string>()

  for (const raw of rawDishes) {
    const match = findMatch(raw.nameEnglish, raw.nameLocal, cachedDishes)
    if (match && !usedCacheIds.has(match.id)) {
      usedCacheIds.add(match.id)
      // Build enriched Dish using cache data but preserving original scan ID and price
      const dish: Dish = {
        id: raw.id,
        nameEnglish: match.nameEnglish,
        nameLocal: raw.nameLocal || match.nameLocal,
        nameLocalCorrected: match.nameLocalCorrected,
        nameRomanized: match.nameRomanized,
        description: match.description,
        country: match.country,
        price: raw.price || match.price,
        dietaryType: match.dietaryType,
        allergens: match.allergens,
        ingredients: match.ingredients,
        nutrition: match.nutrition,
        explanation: match.explanation,
        culturalTerms: match.culturalTerms,
        imageSearchQuery: match.imageSearchQuery,
      }
      hits.push(dish)

      // Collect image URLs
      const urls = match.imageUrls || (match.imageUrl ? [match.imageUrl] : [])
      if (urls.length > 0) {
        hitImages[raw.id] = urls
      }
    } else {
      missIds.add(raw.id)
    }
  }

  return { hits, hitImages, missIds }
}

/**
 * Preload a cuisine's cache into IndexedDB (call on app init or after detecting cuisine).
 * Non-blocking, fire-and-forget.
 */
export function preloadCuisine(cuisine: string): void {
  loadCuisine(cuisine).catch(() => {})
}
