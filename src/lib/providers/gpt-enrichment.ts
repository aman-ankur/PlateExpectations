import { EnrichmentProvider, DishDetail } from './types'
import { Dish, RawDish } from '../types'
import { gptCall, parseJSON, buildEnrichmentPrompt, buildCardEnrichmentPrompt, buildDetailEnrichmentPrompt } from './shared'

function buildDishList(dishes: Array<{ id: string; nameEnglish: string; nameLocal: string; price?: string; brief: string }>): string {
  return dishes
    .map((d) => `${d.id}: ${d.nameEnglish} (${d.nameLocal}) - ${d.price || ''} - ${d.brief}`)
    .join('\n')
}

async function callGpt(systemPrompt: string, dishList: string, signal?: AbortSignal): Promise<string> {
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: `Enrich these dishes:\n${dishList}` },
  ]
  return gptCall({ model: 'gpt-4o-mini', messages, max_tokens: 8192, temperature: 0.2, response_format: { type: 'json_object' } }, signal)
}

function withCardDefaults(dish: Partial<Dish> & { id: string }): Dish {
  return {
    nameEnglish: '',
    nameLocal: '',
    description: '',
    country: '',
    price: '',
    dietaryType: 'non-veg',
    allergens: [],
    ingredients: [],
    nutrition: { protein: 0, carbs: 0, fat: 0, fiber: 0, kcal: 0 },
    explanation: '',
    culturalTerms: [],
    ...dish,
  } as Dish
}

export const gptEnrichmentProvider: EnrichmentProvider = {
  name: 'gpt',

  async enrichBatch(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]> {
    const country = dishes[0]?.country || 'unknown'
    const res = await callGpt(buildEnrichmentPrompt(country, prefsDescription), buildDishList(dishes), signal)
    const parsed = parseJSON(res)
    return parsed.dishes || []
  },

  async enrichBatchCard(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]> {
    const country = dishes[0]?.country || 'unknown'
    const res = await callGpt(buildCardEnrichmentPrompt(country, prefsDescription), buildDishList(dishes), signal)
    const parsed = parseJSON(res)
    const result: Partial<Dish>[] = parsed.dishes || []
    return result.map((d) => withCardDefaults({ ...d, id: d.id || '' }))
  },

  async enrichBatchDetail(dishes: Array<{ id: string; nameEnglish: string; nameLocal: string; brief: string; country: string }>, prefsDescription: string, signal?: AbortSignal): Promise<DishDetail[]> {
    const country = dishes[0]?.country || 'unknown'
    const res = await callGpt(buildDetailEnrichmentPrompt(country, prefsDescription), buildDishList(dishes), signal)
    const parsed = parseJSON(res)
    return parsed.dishes || []
  },
}
