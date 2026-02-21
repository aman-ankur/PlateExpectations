import { EnrichmentProvider, DishDetail } from './types'
import { Dish, RawDish } from '../types'
import { groqCall, gptCall, parseJSON, GROQ_API_KEY, buildEnrichmentPrompt, buildCardEnrichmentPrompt, buildDetailEnrichmentPrompt } from './shared'

function buildDishList(dishes: Array<{ id: string; nameEnglish: string; nameLocal: string; price?: string; brief: string }>): string {
  return dishes
    .map((d) => `${d.id}: ${d.nameEnglish} (${d.nameLocal}) - ${d.price || ''} - ${d.brief}`)
    .join('\n')
}

async function callGroqThenGpt(systemPrompt: string, dishList: string, signal?: AbortSignal): Promise<string> {
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: `Enrich these dishes:\n${dishList}` },
  ]
  const callParams = { messages, max_tokens: 8192, temperature: 0.2, response_format: { type: 'json_object' } }

  if (GROQ_API_KEY) {
    try {
      const res = await groqCall({ model: 'llama-3.3-70b-versatile', ...callParams }, signal)
      const parsed = parseJSON(res)
      if ((parsed.dishes || []).length > 0) return res
      console.log('[groq-enrichment] Returned 0 dishes, falling back to GPT')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[groq-enrichment] Failed (${msg}), falling back to GPT`)
    }
  }

  return gptCall({ model: 'gpt-4o-mini', ...callParams }, signal)
}

/** Default empty values for Tier 2 fields when doing Tier 1 only */
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

export const groqEnrichmentProvider: EnrichmentProvider = {
  name: 'groq',

  async enrichBatch(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]> {
    const country = dishes[0]?.country || 'unknown'
    const res = await callGroqThenGpt(buildEnrichmentPrompt(country, prefsDescription), buildDishList(dishes), signal)
    const parsed = parseJSON(res)
    const result = parsed.dishes || []
    if (result.length < dishes.length) {
      console.warn(`[groq-enrichment] Full: returned ${result.length}/${dishes.length} dishes`)
    }
    return result
  },

  async enrichBatchCard(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]> {
    const country = dishes[0]?.country || 'unknown'
    const res = await callGroqThenGpt(buildCardEnrichmentPrompt(country, prefsDescription), buildDishList(dishes), signal)
    const parsed = parseJSON(res)
    const result: Partial<Dish>[] = parsed.dishes || []
    if (result.length < dishes.length) {
      console.warn(`[groq-enrichment] Card: returned ${result.length}/${dishes.length} dishes`)
    }
    return result.map((d) => withCardDefaults({ ...d, id: d.id || '' }))
  },

  async enrichBatchDetail(dishes: Array<{ id: string; nameEnglish: string; nameLocal: string; brief: string; country: string }>, prefsDescription: string, signal?: AbortSignal): Promise<DishDetail[]> {
    const country = dishes[0]?.country || 'unknown'
    const res = await callGroqThenGpt(buildDetailEnrichmentPrompt(country, prefsDescription), buildDishList(dishes), signal)
    const parsed = parseJSON(res)
    return parsed.dishes || []
  },
}
