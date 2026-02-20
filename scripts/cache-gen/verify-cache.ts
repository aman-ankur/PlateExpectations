#!/usr/bin/env npx tsx
/**
 * Offline cache verification script.
 * Tests: fuzzy matching accuracy, image URL validity, cache JSON integrity.
 * Run: npx tsx scripts/cache-gen/verify-cache.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const CACHE_DIR = path.join(__dirname, '../../public/cache')

interface CachedDish {
  id: string
  nameEnglish: string
  nameLocal: string
  nameLocalCorrected?: string
  nameRomanized?: string
  matchKeys: string[]
  imageUrl?: string
  imageUrls?: string[]
  description: string
  ingredients: { name: string; category: string; isUnfamiliar: boolean }[]
  nutrition: { protein: number; carbs: number; fat: number; fiber: number; kcal: number }
  allergens: string[]
  dietaryType: string
  culturalTerms: { term: string; explanation: string }[]
}

interface CacheFile {
  version: number
  cuisine: string
  country: string
  dishes: CachedDish[]
}

// ─── 1. Schema integrity ─────────────────────────────────────────────

function verifySchema(cuisine: string, data: CacheFile): string[] {
  const errors: string[] = []
  if (!data.version) errors.push(`${cuisine}: missing version`)
  if (!data.cuisine) errors.push(`${cuisine}: missing cuisine`)
  if (!data.country) errors.push(`${cuisine}: missing country`)
  if (!Array.isArray(data.dishes)) {
    errors.push(`${cuisine}: dishes is not an array`)
    return errors
  }
  if (data.dishes.length !== 25) errors.push(`${cuisine}: expected 25 dishes, got ${data.dishes.length}`)

  for (const dish of data.dishes) {
    const prefix = `${cuisine}/${dish.nameEnglish || dish.id}`
    if (!dish.nameEnglish) errors.push(`${prefix}: missing nameEnglish`)
    if (!dish.nameLocal) errors.push(`${prefix}: missing nameLocal`)
    if (!dish.description) errors.push(`${prefix}: missing description`)
    if (!dish.matchKeys || dish.matchKeys.length === 0) errors.push(`${prefix}: missing matchKeys`)
    if (!dish.ingredients || dish.ingredients.length === 0) errors.push(`${prefix}: missing ingredients`)
    if (!dish.nutrition) errors.push(`${prefix}: missing nutrition`)
    if (!dish.allergens) errors.push(`${prefix}: missing allergens (can be empty array)`)
    if (!dish.dietaryType) errors.push(`${prefix}: missing dietaryType`)
  }
  return errors
}

// ─── 2. Fuzzy matching simulation ────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function findMatch(nameEnglish: string, nameLocal: string, dishes: CachedDish[]): CachedDish | null {
  const normEn = normalize(nameEnglish)
  const normLocal = normalize(nameLocal)

  for (const cd of dishes) {
    for (const key of cd.matchKeys) {
      if (normalize(key) === normEn || normalize(key) === normLocal) return cd
    }
  }
  for (const cd of dishes) {
    if (normalize(cd.nameEnglish) === normEn) return cd
    if (normalize(cd.nameLocal) === normLocal) return cd
    if (cd.nameRomanized && normalize(cd.nameRomanized) === normEn) return cd
  }
  for (const cd of dishes) {
    const cdEn = normalize(cd.nameEnglish)
    if (normEn.length >= 3 && (cdEn.includes(normEn) || normEn.includes(cdEn))) return cd
  }
  if (nameLocal && nameLocal.length >= 2) {
    for (const cd of dishes) {
      if (cd.nameLocal && (cd.nameLocal.includes(nameLocal) || nameLocal.includes(cd.nameLocal))) return cd
    }
  }
  return null
}

// Simulate OCR-like inputs (typos, different romanizations, partial names)
const TEST_QUERIES: Record<string, { nameEnglish: string; nameLocal: string; expected: string }[]> = {
  korean: [
    { nameEnglish: 'Bibimbap', nameLocal: '비빔밥', expected: 'Bibimbap' },
    { nameEnglish: 'Bulgogi', nameLocal: '불고기', expected: 'Bulgogi' },
    { nameEnglish: 'Kimchi Jjigae', nameLocal: '김치찌개', expected: 'Kimchi Jjigae' },
    { nameEnglish: 'Tteokbokki', nameLocal: '떡볶이', expected: 'Tteokbokki' },
    { nameEnglish: 'Japchae', nameLocal: '잡채', expected: 'Japchae' },
    // OCR might return slightly different romanization
    { nameEnglish: 'Dak Galbi', nameLocal: '닭갈비', expected: 'Dakgalbi' },
    { nameEnglish: 'Kal Guksu', nameLocal: '칼국수', expected: 'Kalguksu' },
    { nameEnglish: 'Sundubu-jjigae', nameLocal: '순두부찌개', expected: 'Sundubu Jjigae' },
  ],
  japanese: [
    { nameEnglish: 'Ramen', nameLocal: 'ラーメン', expected: 'Ramen' },
    { nameEnglish: 'Sushi', nameLocal: '寿司', expected: 'Sushi' },
    { nameEnglish: 'Tonkatsu', nameLocal: 'とんかつ', expected: 'Tonkatsu' },
    { nameEnglish: 'Tempura', nameLocal: '天ぷら', expected: 'Tempura' },
    { nameEnglish: 'Udon', nameLocal: 'うどん', expected: 'Udon' },
    { nameEnglish: 'Gyudon', nameLocal: '牛丼', expected: 'Gyudon' },
  ],
  thai: [
    { nameEnglish: 'Pad Thai', nameLocal: 'ผัดไทย', expected: 'Pad Thai' },
    { nameEnglish: 'Tom Yum Goong', nameLocal: 'ต้มยำกุ้ง', expected: 'Tom Yum Goong' },
    { nameEnglish: 'Green Curry', nameLocal: 'แกงเขียวหวาน', expected: 'Green Curry' },
    { nameEnglish: 'Som Tam', nameLocal: 'ส้มตำ', expected: 'Som Tum' },
    { nameEnglish: 'Khao Pad', nameLocal: 'ข้าวผัด', expected: 'Khao Pad' },
  ],
  vietnamese: [
    { nameEnglish: 'Pho', nameLocal: 'Phở', expected: 'Pho' },
    { nameEnglish: 'Banh Mi', nameLocal: 'Bánh mì', expected: 'Banh Mi' },
    { nameEnglish: 'Bun Cha', nameLocal: 'Bún chả', expected: 'Bun Cha' },
    { nameEnglish: 'Goi Cuon', nameLocal: 'Gỏi cuốn', expected: 'Fresh Spring Rolls' },
    { nameEnglish: 'Com Tam', nameLocal: 'Cơm tấm', expected: 'Broken Rice' },
  ],
  malaysian: [
    { nameEnglish: 'Nasi Lemak', nameLocal: 'Nasi Lemak', expected: 'Nasi Lemak' },
    { nameEnglish: 'Char Kway Teow', nameLocal: 'Char Kway Teow', expected: 'Char Kway Teow' },
    { nameEnglish: 'Roti Canai', nameLocal: 'Roti Canai', expected: 'Roti Canai' },
    { nameEnglish: 'Laksa', nameLocal: 'Laksa', expected: 'Laksa' },
    { nameEnglish: 'Satay', nameLocal: 'Satay', expected: 'Satay' },
  ],
}

function verifyMatching(cuisine: string, dishes: CachedDish[]): { pass: number; fail: number; failures: string[] } {
  const queries = TEST_QUERIES[cuisine] || []
  let pass = 0, fail = 0
  const failures: string[] = []

  for (const q of queries) {
    const match = findMatch(q.nameEnglish, q.nameLocal, dishes)
    if (match && normalize(match.nameEnglish) === normalize(q.expected)) {
      pass++
    } else {
      fail++
      failures.push(`  "${q.nameEnglish}" / "${q.nameLocal}" → ${match ? match.nameEnglish : 'NO MATCH'} (expected: ${q.expected})`)
    }
  }
  return { pass, fail, failures }
}

// ─── 3. Image URL validation (HEAD requests) ─────────────────────────

async function checkImageUrl(url: string): Promise<{ ok: boolean; status: number; contentType: string }> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'PlateExpectations/1.0 (verification script)' },
      redirect: 'follow',
    })
    const ct = res.headers.get('content-type') || ''
    return { ok: res.ok && ct.startsWith('image/'), status: res.status, contentType: ct }
  } catch (e) {
    return { ok: false, status: 0, contentType: `error: ${e}` }
  }
}

async function verifyImages(cuisine: string, dishes: CachedDish[]): Promise<{ ok: number; broken: number; missing: number; brokenList: string[] }> {
  let ok = 0, broken = 0, missing = 0
  const brokenList: string[] = []

  // Check in batches of 3 to avoid rate-limiting Wikipedia
  for (let i = 0; i < dishes.length; i += 3) {
    const batch = dishes.slice(i, i + 3)
    const results = await Promise.all(
      batch.map(async (dish) => {
        const url = dish.imageUrl || dish.imageUrls?.[0]
        if (!url) return { dish, result: null }
        const result = await checkImageUrl(url)
        return { dish, result }
      })
    )
    for (const { dish, result } of results) {
      if (!result) {
        missing++
      } else if (result.ok) {
        ok++
      } else {
        broken++
        brokenList.push(`  ${dish.nameEnglish}: HTTP ${result.status} (${result.contentType}) — ${dish.imageUrl?.substring(0, 80)}...`)
      }
    }
    // Rate limit — Wikipedia is aggressive about 429s
    if (i + 3 < dishes.length) await new Promise(r => setTimeout(r, 1000))
  }

  return { ok, broken, missing, brokenList }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const cuisines = ['korean', 'japanese', 'thai', 'vietnamese', 'malaysian']
  let totalErrors = 0

  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   Offline Cuisine Cache Verification Suite   ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // 1. Schema checks
  console.log('━━━ 1. Schema Integrity ━━━')
  for (const cuisine of cuisines) {
    const filePath = path.join(CACHE_DIR, `${cuisine}.json`)
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ ${cuisine}.json not found`)
      totalErrors++
      continue
    }
    const data: CacheFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const errors = verifySchema(cuisine, data)
    if (errors.length === 0) {
      console.log(`  ✓ ${cuisine}: ${data.dishes.length} dishes, all fields present`)
    } else {
      console.log(`  ❌ ${cuisine}: ${errors.length} errors`)
      errors.forEach(e => console.log(`    ${e}`))
      totalErrors += errors.length
    }
  }

  // 2. Fuzzy matching
  console.log('\n━━━ 2. Fuzzy Matching ━━━')
  for (const cuisine of cuisines) {
    const filePath = path.join(CACHE_DIR, `${cuisine}.json`)
    if (!fs.existsSync(filePath)) continue
    const data: CacheFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const { pass, fail, failures } = verifyMatching(cuisine, data.dishes)
    if (fail === 0) {
      console.log(`  ✓ ${cuisine}: ${pass}/${pass + fail} queries matched`)
    } else {
      console.log(`  ⚠ ${cuisine}: ${pass}/${pass + fail} matched, ${fail} failed:`)
      failures.forEach(f => console.log(f))
      totalErrors += fail
    }
  }

  // 3. Image URL validation
  console.log('\n━━━ 3. Image URL Validation (HEAD requests to Wikipedia) ━━━')
  for (const cuisine of cuisines) {
    const filePath = path.join(CACHE_DIR, `${cuisine}.json`)
    if (!fs.existsSync(filePath)) continue
    const data: CacheFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    process.stdout.write(`  ${cuisine}: checking ${data.dishes.length} dishes...`)
    const { ok, broken, missing, brokenList } = await verifyImages(cuisine, data.dishes)
    if (broken === 0) {
      console.log(` ✓ ${ok} ok, ${missing} missing (no URL)`)
    } else {
      console.log(` ⚠ ${ok} ok, ${broken} BROKEN, ${missing} missing`)
      brokenList.forEach(b => console.log(b))
      totalErrors += broken
    }
  }

  // Summary
  console.log('\n━━━ Summary ━━━')
  if (totalErrors === 0) {
    console.log('✅ All checks passed!')
  } else {
    console.log(`⚠ ${totalErrors} total issues found`)
  }
  process.exit(totalErrors > 0 ? 1 : 0)
}

main().catch(console.error)
