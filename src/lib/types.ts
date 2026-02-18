export interface Ingredient {
  name: string
  category: 'protein' | 'vegetable' | 'sauce' | 'carb' | 'dairy' | 'spice' | 'other'
  isUnfamiliar: boolean
  explanation?: string
}

export interface CulturalTerm {
  term: string
  explanation: string
}

export interface Dish {
  id: string
  nameEnglish: string
  nameLocal: string
  description: string
  country: string
  price: string
  dietaryType: 'veg' | 'non-veg' | 'jain-safe'
  allergens: string[]
  ingredients: Ingredient[]
  nutrition: {
    protein: number
    carbs: number
    fat: number
    fiber: number
    kcal: number
  }
  explanation: string
  culturalTerms: CulturalTerm[]
  imageUrl?: string
  imageSearchQuery?: string
  rankScore?: number
  rankLabel?: string
}

export interface Preferences {
  proteins: string[]
  spice: string
  diet: string
  restrictions: string[]
  allergies: string[]
  hasCompletedOnboarding: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  proteins: [],
  spice: '',
  diet: '',
  restrictions: [],
  allergies: [],
  hasCompletedOnboarding: false,
}
