import { RawDish } from '../types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export { OPENAI_API_KEY, GROQ_API_KEY }

/** Low-level Groq API call wrapper (OpenAI-compatible). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function groqCall(body: Record<string, any>, signal?: AbortSignal): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured')
  const t = Date.now()
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[groq] groqCall FAILED in ${Date.now() - t}ms: ${res.status} ${err.substring(0, 300)}`)
    throw new Error(`Groq API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  const content = data.choices[0].message.content
  console.log(`[groq] groqCall OK in ${Date.now() - t}ms, finish=${data.choices[0].finish_reason}, len=${content?.length}`)
  return content
}

/** Low-level OpenAI API call wrapper. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gptCall(body: Record<string, any>, signal?: AbortSignal): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
  const t = Date.now()
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[openai] gptCall FAILED in ${Date.now() - t}ms: ${res.status} ${err.substring(0, 300)}`)
    throw new Error(`OpenAI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  const content = data.choices[0].message.content
  console.log(`[openai] gptCall OK in ${Date.now() - t}ms, finish=${data.choices[0].finish_reason}, len=${content?.length}`)
  return content
}

/** Parse JSON with fallback for malformed responses. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJSON(content: string): any {
  try {
    return JSON.parse(content)
  } catch {
    const arrayMatch = content.match(/\[[\s\S]*\]/)
    if (arrayMatch) return { dishes: JSON.parse(arrayMatch[0]) }
    throw new Error('Failed to parse menu data')
  }
}

/** Backfill empty nameLocal from OCR text. Llama models sometimes omit non-Latin scripts in JSON. */
export function backfillNameLocal(dishes: RawDish[], ocrText: string): RawDish[] {
  return dishes.map((dish) => {
    if (dish.nameLocal && dish.nameLocal.trim()) return dish
    const engLower = dish.nameEnglish.toLowerCase().replace(/\s+/g, '')
    const lines = ocrText.split('\n')
    for (const line of lines) {
      const lineNonLatin = line.match(/[^\x00-\x7F\s]+(?:\s*[^\x00-\x7F\s]+)*/g)
      if (!lineNonLatin) continue
      const hasPrice = dish.price && line.includes(dish.price)
      const lineLatinLower = line.replace(/[^\x00-\x7F]/g, '').toLowerCase().replace(/\s+/g, '')
      const hasEngMatch = engLower.length > 3 && lineLatinLower.includes(engLower)
      if (hasPrice || hasEngMatch) {
        return { ...dish, nameLocal: lineNonLatin.join(' ') }
      }
    }
    return dish
  })
}

export function buildPrefsDescription(preferences: { diet?: string; proteins?: string[]; spice?: string; restrictions?: string[]; allergies?: string[] }): string {
  return [
    preferences.diet && `Diet: ${preferences.diet}`,
    preferences.proteins && preferences.proteins.length > 0 && `Enjoys: ${preferences.proteins.join(', ')}`,
    preferences.spice && `Spice tolerance: ${preferences.spice}`,
    preferences.restrictions && preferences.restrictions.length > 0 && `Restrictions: ${preferences.restrictions.join(', ')}`,
    preferences.allergies && preferences.allergies.length > 0 && `Allergies: ${preferences.allergies.join(', ')}`,
  ].filter(Boolean).join('. ')
}

/** The extraction prompt used by text-based Phase 1 providers */
export const EXTRACTION_SYSTEM_PROMPT = `You are given OCR text from a restaurant menu. Extract EVERY dish/item. Do NOT skip any items. Include all sections, categories, and variations. Return JSON: {"dishes":[{"id":"dish-1","nameEnglish":"...","nameLocal":"original script in native characters (e.g. 김치전, ผัดไทย). If the menu is only in English, infer the native script from the dish name and country.","price":"...","brief":"3 word description","country":"Korea|Thailand|Vietnam|Japan|Indonesia"}]}. Number IDs sequentially. Minimal output but complete coverage.`

/** The extraction prompt for vision-based providers */
export const VISION_EXTRACTION_SYSTEM_PROMPT = `Extract EVERY single dish/item from this menu image. Do NOT skip any items. Include all sections, categories, and variations. Return JSON: {"dishes":[{"id":"dish-1","nameEnglish":"...","nameLocal":"original script","price":"...","brief":"3 word description","country":"Korea|Thailand|Vietnam|Japan|Indonesia"}]}. Number IDs sequentially. Minimal output but complete coverage.`

/** Full enrichment prompt */
export function buildEnrichmentPrompt(country: string, prefsDescription: string): string {
  return `You enrich ${country} restaurant dishes for Indian travelers.

For each dish return ALL these fields:
- "id": keep the original id
- "nameEnglish": English name
- "nameLocal": original script (as given from OCR — keep unchanged)
- "nameLocalCorrected": the CORRECT local script name, fixing any OCR errors (e.g. if OCR gave "CÒI CUỐN" but the dish is spring rolls, correct to "GỎI CUỐN"). If OCR was already correct, set equal to nameLocal.
- "description": 1-2 sentences describing the dish — what it looks like, key ingredients, cooking method, and how it tastes
- "country": "${country}"
- "price": as given
- "dietaryType": "veg" (no meat/fish/eggs), "non-veg", or "jain-safe"
- "allergens": from [egg, soy, sesame, peanut, shellfish, gluten, dairy] — only those present
- "ingredients": [{"name":"...", "category":"protein|vegetable|sauce|carb|dairy|spice|other", "isUnfamiliar":true/false, "explanation":"brief if unfamiliar else empty"}] — top 4-5 ingredients
- "nutrition": {"protein":g, "carbs":g, "fat":g, "fiber":g, "kcal":num} — approximate
- "explanation": 2-3 sentences. First: describe what the dish actually is (cooking method, key flavors, how it's served/eaten). Second: compare to a well-known Indian or global dish if a good analogy exists (e.g. "Similar to tandoori chicken..." or "Think of it as a Korean version of biryani..."). Third (optional): a tip or recommendation (e.g. "Best enjoyed with steamed rice" or "Ask for extra sauce on the side").
- "culturalTerms": [{"term":"...", "explanation":"..."}] — 0-2 terms
- "imageSearchQuery": the dish's most common/canonical name for Wikipedia search. Use the well-known local name if it has a Wikipedia article (e.g. "Gỏi cuốn", "Phở", "Bánh mì") rather than generic English (e.g. DON'T use "Vietnamese spring rolls")
- "rankScore": 0-30 popularity score

${prefsDescription ? `User preferences: ${prefsDescription}` : ''}

Return JSON: {"dishes": [<array>]}. Be concise.`
}

/** Tier 1 (card) enrichment prompt — fewer fields, ~50% less tokens */
export function buildCardEnrichmentPrompt(country: string, prefsDescription: string): string {
  return `You enrich ${country} restaurant dishes for Indian travelers. Return ONLY card-level fields.

For each dish return these fields:
- "id": keep the original id
- "nameEnglish": English name
- "nameLocal": original script (as given from OCR — keep unchanged)
- "nameLocalCorrected": the CORRECT local script name, fixing any OCR errors. If OCR was already correct, set equal to nameLocal.
- "description": 1 sentence — what it is and key ingredients
- "country": "${country}"
- "price": as given
- "dietaryType": "veg" (no meat/fish/eggs), "non-veg", or "jain-safe"
- "allergens": from [egg, soy, sesame, peanut, shellfish, gluten, dairy] — only those present
- "imageSearchQuery": canonical local name for Wikipedia (e.g. "Gỏi cuốn", "Phở", not generic English)
- "rankScore": 0-30 popularity score

${prefsDescription ? `User preferences: ${prefsDescription}` : ''}

Return JSON: {"dishes": [<array>]}. Be concise.`
}

/** Tier 2 (detail) enrichment prompt — on-demand detail fields */
export function buildDetailEnrichmentPrompt(country: string, prefsDescription: string): string {
  return `You provide detailed enrichment for ${country} restaurant dishes for Indian travelers.

For each dish return these fields:
- "id": keep the original id
- "ingredients": [{"name":"...", "category":"protein|vegetable|sauce|carb|dairy|spice|other", "isUnfamiliar":true/false, "explanation":"brief if unfamiliar else empty"}] — top 4-5 ingredients
- "nutrition": {"protein":g, "carbs":g, "fat":g, "fiber":g, "kcal":num} — approximate per serving
- "explanation": 2-3 sentences. First: describe cooking method, key flavors, how it's served/eaten. Second: compare to a well-known Indian or global dish if possible. Third (optional): a tip.
- "culturalTerms": [{"term":"...", "explanation":"..."}] — 0-2 terms

${prefsDescription ? `User preferences: ${prefsDescription}` : ''}

Return JSON: {"dishes": [<array>]}. Be concise.`
}
