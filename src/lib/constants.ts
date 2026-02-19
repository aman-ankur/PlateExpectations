export const PROTEIN_OPTIONS = [
  { id: 'chicken', label: 'Chicken', emoji: '🍗' },
  { id: 'beef', label: 'Beef', emoji: '🥩' },
  { id: 'pork', label: 'Pork', emoji: '🐷' },
  { id: 'seafood', label: 'Seafood', emoji: '🦐' },
]

export const SPICE_OPTIONS = ['Mild', 'Medium', 'Spicy', 'Any']

export const DIET_OPTIONS = ['Veg', 'Non-Veg', 'Jain']

export const RESTRICTION_OPTIONS = ['Halal', 'No Beef', 'No Pork']

export const ALLERGY_OPTIONS = ['Egg', 'Soy', 'Sesame', 'Peanut', 'Shellfish', 'Gluten']

export const SUPPORTED_COUNTRIES = ['Vietnam', 'Thailand', 'Korea', 'Japan', 'Indonesia']

export const CURRENCY_OPTIONS = [
  { id: 'USD', label: 'US Dollar', symbol: '$' },
  { id: 'EUR', label: 'Euro', symbol: '€' },
  { id: 'GBP', label: 'British Pound', symbol: '£' },
  { id: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { id: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { id: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { id: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
]

export const COUNTRY_CURRENCY: Record<string, string> = {
  Vietnam: 'VND', Thailand: 'THB', Korea: 'KRW', Japan: 'JPY', Indonesia: 'IDR',
}

// 1 USD = X units. Approximate, last updated Feb 2026.
export const APPROX_RATES_TO_USD: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, AUD: 1.53, CAD: 1.36, SGD: 1.34,
  VND: 24500, THB: 35.5, KRW: 1320, JPY: 150, IDR: 15700,
}
