import { create } from 'zustand'
import { Dish, RawDish, Preferences, DEFAULT_PREFERENCES } from './types'
import { APPROX_RATES_TO_USD } from './constants'
import { ScanHistorySummary, getAllScans, getScan, putScan, deleteScan as deleteHistoryScan, generateThumbnail } from './scan-history'

// Shared across all batches — tracks URLs already assigned to prevent duplicates
const usedImageUrls = new Set<string>()
// Tracks which specific URLs are AI-generated (for per-image badge)
const generatedImageUrls = new Set<string>()

function assignDishImages(
  dish: Dish,
  imageUrls: string[],
  generatedFlags: boolean[],
  get: () => AppState,
) {
  const dedupedUrls: string[] = []
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i]
    if (!usedImageUrls.has(url)) {
      usedImageUrls.add(url)
      dedupedUrls.push(url)
      if (generatedFlags[i]) generatedImageUrls.add(url)
    }
  }
  if (dedupedUrls.length > 0) {
    get().setDishImages(dish.id, dedupedUrls)
  }
}

// Strip parenthetical suffixes like (150g), (1kg), (200g) that break Wikipedia search
function cleanImageQuery(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

function loadPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const stored = localStorage.getItem('pe-preferences')
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function loadOrder(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem('pe-order')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function loadDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  return document.cookie.split('; ').some((c) => c === 'pe-demo=true')
}

function loadTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem('pe-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {}
  return 'light'
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof window === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try { localStorage.setItem('pe-theme', theme) } catch {}
}

function saveOrder(order: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('pe-order', JSON.stringify(order))
  } catch { /* ignore */ }
}

interface AppState {
  // Theme
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  // Demo mode
  demoMode: boolean
  toggleDemoMode: () => void

  // Preferences
  preferences: Preferences
  setPreferences: (prefs: Partial<Preferences>) => void

  // Scan
  dishes: Dish[]
  isLoading: boolean
  error: string | null
  selectedDishId: string | null
  scanProgress: string | null
  skeletonDishes: RawDish[]
  setDishes: (dishes: Dish[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedDish: (id: string | null) => void
  setScanProgress: (message: string | null) => void
  setSkeletonDishes: (dishes: RawDish[]) => void
  appendEnrichedDishes: (dishes: Dish[]) => void
  mergeDishDetail: (dishId: string, detail: Partial<Dish>) => void
  clearScan: () => void

  // Image
  menuImage: string | null
  setMenuImage: (image: string | null) => void

  // Dish image cache: dishId -> imageUrl[]
  dishImages: Record<string, string[]>
  setDishImages: (dishId: string, urls: string[]) => void
  addDishImage: (dishId: string, url: string) => void
  fetchDishImages: () => void
  fetchDishImagesForBatch: (dishes: Dish[]) => void
  isGeneratedImage: (url: string) => boolean

  // Exchange rates
  exchangeRates: Record<string, number>
  lastRatesUpdate: number
  fetchExchangeRates: () => void

  // Scan history
  scanHistoryList: ScanHistorySummary[]
  loadScanHistoryList: () => Promise<void>
  saveScan: () => Promise<void>
  loadScan: (id: string) => Promise<void>
  deleteScanFromHistory: (id: string) => Promise<void>

  // Order
  order: Record<string, number>
  addToOrder: (dishId: string) => void
  removeFromOrder: (dishId: string) => void
  updateQuantity: (dishId: string, quantity: number) => void
  clearOrder: () => void
}

export const useStore = create<AppState>((set, get) => ({
  // Theme
  theme: loadTheme(),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },

  // Demo mode
  demoMode: loadDemoMode(),
  toggleDemoMode: () => {
    const next = !get().demoMode
    if (typeof window !== 'undefined') {
      if (next) {
        document.cookie = 'pe-demo=true; path=/; max-age=31536000'
      } else {
        document.cookie = 'pe-demo=; path=/; max-age=0'
      }
    }
    set({ demoMode: next })
  },
  preferences: loadPreferences(),
  setPreferences: (prefs) => {
    const updated = { ...get().preferences, ...prefs }
    if (typeof window !== 'undefined') {
      localStorage.setItem('pe-preferences', JSON.stringify(updated))
    }
    set({ preferences: updated })
  },

  dishes: [],
  isLoading: false,
  error: null,
  selectedDishId: null,
  scanProgress: null,
  skeletonDishes: [],
  setDishes: (dishes) => set({ dishes }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedDish: (selectedDishId) => set({ selectedDishId }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  setSkeletonDishes: (skeletonDishes) => set({ skeletonDishes }),
  appendEnrichedDishes: (newDishes) => {
    const existing = get().dishes
    // Merge by replacing any existing dish with same id, or append
    // When lazy enrichment is on, incoming dishes may have empty Tier 2 fields —
    // preserve existing Tier 2 data (from cache) if the incoming dish has defaults
    const merged = [...existing]
    for (const dish of newDishes) {
      const idx = merged.findIndex((d) => d.id === dish.id)
      if (idx >= 0) {
        const prev = merged[idx]
        merged[idx] = {
          ...dish,
          // Keep existing Tier 2 data if incoming has empty defaults
          ingredients: dish.ingredients?.length > 0 ? dish.ingredients : prev.ingredients,
          nutrition: dish.nutrition?.kcal > 0 ? dish.nutrition : prev.nutrition,
          explanation: dish.explanation || prev.explanation,
          culturalTerms: dish.culturalTerms?.length > 0 ? dish.culturalTerms : prev.culturalTerms,
        }
      } else {
        merged.push(dish)
      }
    }
    set({ dishes: merged })
  },
  mergeDishDetail: (dishId, detail) => {
    const dishes = get().dishes.map((d) =>
      d.id === dishId ? { ...d, ...detail } : d
    )
    set({ dishes })
  },
  clearScan: () => {
    usedImageUrls.clear()
    generatedImageUrls.clear()
    saveOrder({})
    set({
    dishes: [],
    skeletonDishes: [],
    dishImages: {},
    menuImage: null,
    scanProgress: null,
    error: null,
    order: {},
  })
  },

  menuImage: null,
  setMenuImage: (menuImage) => set({ menuImage }),

  dishImages: {},
  setDishImages: (dishId, urls) =>
    set((state) => ({ dishImages: { ...state.dishImages, [dishId]: urls } })),
  addDishImage: (dishId, url) =>
    set((state) => {
      const existing = state.dishImages[dishId] || []
      if (existing.includes(url)) return state
      return { dishImages: { ...state.dishImages, [dishId]: [...existing, url] } }
    }),
  fetchDishImages: () => {
    const { dishes, dishImages } = get()
    dishes.forEach((dish) => {
      if (dish.imageSearchQuery && !dishImages[dish.id]) {
        const query = cleanImageQuery(dish.nameLocalCorrected || dish.nameLocal || dish.imageSearchQuery || dish.nameEnglish)
        const fallback = dish.imageSearchQuery || dish.nameEnglish
        const params = new URLSearchParams({ q: query, fallback })
        if (dish.nameEnglish) params.set('dishName', dish.nameEnglish)
        if (dish.description) params.set('description', dish.description)
        const url = `/api/dish-image?${params}`
        fetch(url)
          .then((r) => r.json())
          .then((data) => {
            const urls: string[] = data.imageUrls || (data.imageUrl ? [data.imageUrl] : [])
            const generated: boolean[] = data.generated || []
            if (urls.length > 0) {
              assignDishImages(dish, urls, generated, get)
            }
          })
          .catch(() => {})
      }
    })
  },
  fetchDishImagesForBatch: (dishes) => {
    const { dishImages } = get()
    dishes.forEach((dish) => {
      if (dish.imageSearchQuery && !dishImages[dish.id]) {
        const query = cleanImageQuery(dish.nameLocalCorrected || dish.nameLocal || dish.imageSearchQuery || dish.nameEnglish)
        const fallback = dish.imageSearchQuery || dish.nameEnglish
        const params = new URLSearchParams({ q: query, fallback })
        if (dish.nameEnglish) params.set('dishName', dish.nameEnglish)
        if (dish.description) params.set('description', dish.description)
        const url = `/api/dish-image?${params}`
        fetch(url)
          .then((r) => r.json())
          .then((data) => {
            const urls: string[] = data.imageUrls || (data.imageUrl ? [data.imageUrl] : [])
            const generated: boolean[] = data.generated || []
            if (urls.length > 0) {
              assignDishImages(dish, urls, generated, get)
            }
          })
          .catch(() => {})
      }
    })
  },
  isGeneratedImage: (url) => generatedImageUrls.has(url),

  // Exchange rates
  exchangeRates: APPROX_RATES_TO_USD,
  lastRatesUpdate: 0,
  fetchExchangeRates: () => {
    const { lastRatesUpdate } = get()
    const sixHours = 6 * 60 * 60 * 1000
    if (Date.now() - lastRatesUpdate < sixHours) return
    fetch('/api/exchange-rates')
      .then((r) => r.json())
      .then((data) => {
        if (data.rates) {
          set({ exchangeRates: data.rates, lastRatesUpdate: Date.now() })
        }
      })
      .catch(() => {})
  },

  // Scan history
  scanHistoryList: [],
  loadScanHistoryList: async () => {
    try {
      const list = await getAllScans()
      set({ scanHistoryList: list })
    } catch { /* IDB unavailable */ }
  },
  saveScan: async () => {
    try {
      const { dishes, menuImage, dishImages } = get()
      if (dishes.length === 0 || !menuImage) return

      const thumbnail = await generateThumbnail(menuImage)

      // Determine majority country
      const countryCount: Record<string, number> = {}
      for (const d of dishes) {
        countryCount[d.country] = (countryCount[d.country] || 0) + 1
      }
      const country = Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'

      // Filter out generated (DALL-E) image URLs — they expire
      const stableImages: Record<string, string[]> = {}
      for (const [dishId, urls] of Object.entries(dishImages)) {
        const stable = urls.filter((u) => !generatedImageUrls.has(u))
        if (stable.length > 0) stableImages[dishId] = stable
      }

      await putScan({
        id: `scan-${Date.now()}`,
        thumbnail,
        savedAt: Date.now(),
        country,
        cuisineLabel: `${country} cuisine`,
        dishCount: dishes.length,
        dishes,
        dishImages: stableImages,
      })

      // Refresh list
      const list = await getAllScans()
      set({ scanHistoryList: list })
    } catch { /* IDB unavailable */ }
  },
  loadScan: async (id) => {
    try {
      const entry = await getScan(id)
      if (!entry) return
      set({
        dishes: entry.dishes,
        dishImages: entry.dishImages,
        menuImage: entry.thumbnail, // use thumbnail as menuImage stand-in
        skeletonDishes: [],
        scanProgress: null,
        error: null,
      })
    } catch { /* IDB unavailable */ }
  },
  deleteScanFromHistory: async (id) => {
    try {
      await deleteHistoryScan(id)
      const list = await getAllScans()
      set({ scanHistoryList: list })
    } catch { /* IDB unavailable */ }
  },

  // Order
  order: loadOrder(),
  addToOrder: (dishId) => {
    const order = { ...get().order }
    order[dishId] = (order[dishId] || 0) + 1
    saveOrder(order)
    set({ order })
  },
  removeFromOrder: (dishId) => {
    const order = { ...get().order }
    delete order[dishId]
    saveOrder(order)
    set({ order })
  },
  updateQuantity: (dishId, quantity) => {
    const order = { ...get().order }
    if (quantity <= 0) {
      delete order[dishId]
    } else {
      order[dishId] = quantity
    }
    saveOrder(order)
    set({ order })
  },
  clearOrder: () => {
    saveOrder({})
    set({ order: {} })
  },
}))
