import { create } from 'zustand'
import { Dish, Preferences, DEFAULT_PREFERENCES } from './types'

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
  setDishes: (dishes: Dish[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedDish: (id: string | null) => void

  // Image
  menuImage: string | null
  setMenuImage: (image: string | null) => void

  // Dish image cache: dishId -> imageUrl
  dishImages: Record<string, string>
  setDishImage: (dishId: string, url: string) => void
  fetchDishImages: () => void
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
  setDishes: (dishes) => set({ dishes }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedDish: (selectedDishId) => set({ selectedDishId }),

  menuImage: null,
  setMenuImage: (menuImage) => set({ menuImage }),

  dishImages: {},
  setDishImage: (dishId, url) =>
    set((state) => ({ dishImages: { ...state.dishImages, [dishId]: url } })),
  fetchDishImages: () => {
    const { dishes, dishImages } = get()
    dishes.forEach((dish) => {
      if (dish.imageSearchQuery && !dishImages[dish.id]) {
        fetch(`/api/dish-image?q=${encodeURIComponent(dish.imageSearchQuery)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.imageUrl) {
              get().setDishImage(dish.id, data.imageUrl)
            }
          })
          .catch(() => {}) // Silently fail — images are non-critical
      }
    })
  },
}))
