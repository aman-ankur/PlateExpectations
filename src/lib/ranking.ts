import { Preferences, Dish } from './types'

const TOP_N = 5

export function rankDishes(dishes: Dish[], preferences: Preferences): Dish[] {
  // Score each dish but keep original menu order
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

    // Use GPT's own rank score as a factor
    if (dish.rankScore) {
      score += dish.rankScore
    }

    return { ...dish, rankScore: score }
  })

  // Only top N dishes get rank labels, kept in original menu order
  const byScore = [...scored].sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
  const topIds = new Set(byScore.slice(0, TOP_N).map((d) => d.id))
  const rankMap = new Map<string, string>()
  let rank = 0
  byScore.forEach((dish) => {
    if (topIds.has(dish.id)) {
      rank++
      rankMap.set(dish.id, rank === 1 ? 'Top Pick' : `#${rank} Pick`)
    }
  })

  return scored.map((dish) => ({
    ...dish,
    rankLabel: rankMap.get(dish.id),
  }))
}
