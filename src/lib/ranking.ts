import { Preferences, Dish } from './types'

export function rankDishes(dishes: Dish[], preferences: Preferences): Dish[] {
  const scored = dishes.map((dish) => {
    let score = 50 // base score

    // Hard penalties for dietary violations
    if (preferences.diet === 'Veg' && dish.dietaryType === 'non-veg') {
      score -= 100
    }
    if (preferences.diet === 'Jain' && dish.dietaryType !== 'jain-safe') {
      score -= 100
    }
    if (preferences.restrictions.includes('No Beef') &&
        dish.ingredients.some((i) => i.name.toLowerCase().includes('beef'))) {
      score -= 100
    }
    if (preferences.restrictions.includes('No Pork') &&
        dish.ingredients.some((i) => i.name.toLowerCase().includes('pork'))) {
      score -= 100
    }

    // Allergen penalty
    for (const allergy of preferences.allergies) {
      if (dish.allergens.some((a) => a.toLowerCase() === allergy.toLowerCase())) {
        score -= 50
      }
    }

    // Protein match bonus
    for (const protein of preferences.proteins) {
      if (dish.ingredients.some((i) =>
        i.category === 'protein' && i.name.toLowerCase().includes(protein.toLowerCase())
      )) {
        score += 15
      }
    }

    // Spice matching is handled by GPT's ranking signal
    // Use GPT's own rank score as a factor
    if (dish.rankScore) {
      score += dish.rankScore
    }

    return { ...dish, rankScore: score }
  })

  const sorted = scored.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))

  return sorted.map((dish, i) => ({
    ...dish,
    rankLabel: i === 0 ? 'Top Pick For You' : `#${i + 1} For You`,
  }))
}
