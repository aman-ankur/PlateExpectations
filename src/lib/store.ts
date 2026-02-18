import { create } from 'zustand'
import { Dish, RawDish, Preferences, DEFAULT_PREFERENCES } from './types'

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

  // Dish image cache: dishId -> imageUrl
  dishImages: Record<string, string>
  setDishImage: (dishId: string, url: string) => void
  fetchDishImages: () => void
  fetchDishImagesForBatch: (dishes: Dish[]) => void
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
  clearScan: () => set({
    dishes: [],
    skeletonDishes: [],
    dishImages: {},
    menuImage: null,
    scanProgress: null,
    error: null,
  }),

  menuImage: null,
  setMenuImage: (menuImage) => set({ menuImage }),

  dishImages: {},
  setDishImage: (dishId, url) =>
    set((state) => ({ dishImages: { ...state.dishImages, [dishId]: url } })),
  fetchDishImages: () => {
    const { dishes, dishImages } = get()
    const usedUrls = new Set(Object.values(dishImages))
    dishes.forEach((dish) => {
      if (dish.imageSearchQuery && !dishImages[dish.id]) {
        const query = cleanImageQuery(dish.nameLocal || dish.imageSearchQuery || dish.nameEnglish)
        fetch(`/api/dish-image?q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.imageUrl && !usedUrls.has(data.imageUrl)) {
              usedUrls.add(data.imageUrl)
              get().setDishImage(dish.id, data.imageUrl)
            }
          })
          .catch(() => {})
      }
    })
  },
  fetchDishImagesForBatch: (dishes) => {
    const { dishImages } = get()
    const usedUrls = new Set(Object.values(dishImages))
    dishes.forEach((dish) => {
      if (dish.imageSearchQuery && !dishImages[dish.id]) {
        const query = cleanImageQuery(dish.nameLocal || dish.imageSearchQuery || dish.nameEnglish)
        fetch(`/api/dish-image?q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.imageUrl && !usedUrls.has(data.imageUrl)) {
              usedUrls.add(data.imageUrl)
              get().setDishImage(dish.id, data.imageUrl)
            }
          })
          .catch(() => {})
      }
    })
  },
}))
