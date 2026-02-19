import { create } from 'zustand'
import { Dish, RawDish, Preferences, DEFAULT_PREFERENCES } from './types'

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

function saveOrder(order: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('pe-order', JSON.stringify(order))
  } catch { /* ignore */ }
}

interface AppState {
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

  // Order
  order: Record<string, number>
  addToOrder: (dishId: string) => void
  removeFromOrder: (dishId: string) => void
  updateQuantity: (dishId: string, quantity: number) => void
  clearOrder: () => void
}

export const useStore = create<AppState>((set, get) => ({
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
    const merged = [...existing]
    for (const dish of newDishes) {
      const idx = merged.findIndex((d) => d.id === dish.id)
      if (idx >= 0) merged[idx] = dish
      else merged.push(dish)
    }
    set({ dishes: merged })
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
