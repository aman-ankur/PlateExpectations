import { Dish, Preferences } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const BATCH_SIZE = 5

interface RawDish {
  id: string
  nameEnglish: string
  nameLocal: string
  price: string
  brief: string
  country: string
}

/**
 * Two-phase parallel pipeline:
 *   Phase 1: GPT-4o Vision extracts dish names/prices from image (~5s, minimal tokens)
 *   Phase 2: GPT-4o-mini enriches dishes in parallel batches (~15s, runs concurrently)
 *
 * Total: ~15-20s instead of 55-90s for a single monolithic call.
 * Bottleneck is OpenAI output token speed (~40-50 tok/s). Parallelizing batches
 * lets us generate tokens concurrently across multiple requests.
 */
export async function scanMenu(imageBase64: string, preferences: Preferences): Promise<Dish[]> {
  // Phase 1: Fast Vision OCR — extract dish list
  console.log('[openai] Phase 1: Vision OCR starting...')
  const t1 = Date.now()
  const rawDishes = await extractDishes(imageBase64)
  console.log('[openai] Phase 1 done:', rawDishes.length, 'dishes in', Date.now() - t1, 'ms')

  if (rawDishes.length === 0) return []

  // Phase 2: Parallel enrichment batches
  console.log('[openai] Phase 2: Enriching in parallel batches of', BATCH_SIZE)
  const t2 = Date.now()
  const enriched = await enrichInParallel(rawDishes, preferences)
  console.log('[openai] Phase 2 done:', enriched.length, 'dishes in', Date.now() - t2, 'ms')

  return enriched
}

/** Phase 1: Vision call — extract just names, prices, local text. Minimal output tokens. */
async function extractDishes(imageBase64: string): Promise<RawDish[]> {
  const res = await gptCall({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Extract every dish from this menu image. Return JSON: {"dishes":[{"id":"dish-1","nameEnglish":"...","nameLocal":"original script","price":"...","brief":"3 word description","country":"Korea|Thailand|Vietnam|Japan|Indonesia"}]}. Minimal output.`,
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageBase64, detail: 'auto' } },
          { type: 'text', text: 'Extract all dishes.' },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  const parsed = parseJSON(res)
  return parsed.dishes || []
}

/** Phase 2: Split dishes into batches, enrich all batches concurrently. */
async function enrichInParallel(rawDishes: RawDish[], preferences: Preferences): Promise<Dish[]> {
  const prefsDescription = [
    preferences.diet && `Diet: ${preferences.diet}`,
    preferences.proteins.length > 0 && `Enjoys: ${preferences.proteins.join(', ')}`,
    preferences.spice && `Spice tolerance: ${preferences.spice}`,
    preferences.restrictions.length > 0 && `Restrictions: ${preferences.restrictions.join(', ')}`,
    preferences.allergies.length > 0 && `Allergies: ${preferences.allergies.join(', ')}`,
  ].filter(Boolean).join('. ')

  // Split into batches
  const batches: RawDish[][] = []
  for (let i = 0; i < rawDishes.length; i += BATCH_SIZE) {
    batches.push(rawDishes.slice(i, i + BATCH_SIZE))
  }

  // Run all batches concurrently
  const results = await Promise.all(
    batches.map((batch) => enrichBatch(batch, prefsDescription))
  )

  // Normalize IDs: enrichment batches may return inconsistent IDs
  const allDishes = results.flat()
  return allDishes.map((dish, i) => ({
    ...dish,
    id: `dish-${i + 1}`,
  }))
}

/** Enrich a single batch of dishes via GPT-4o-mini (no vision needed). */
async function enrichBatch(dishes: RawDish[], prefsDescription: string): Promise<Dish[]> {
  const dishList = dishes
    .map((d) => `${d.id}: ${d.nameEnglish} (${d.nameLocal}) - ${d.price} - ${d.brief}`)
    .join('\n')

  const country = dishes[0]?.country || 'unknown'

  const res = await gptCall({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You enrich ${country} restaurant dishes for Indian travelers.

For each dish return ALL these fields:
- "id": keep the original id
- "nameEnglish": English name
- "nameLocal": original script
- "description": 1 sentence description
- "country": "${country}"
- "price": as given
- "dietaryType": "veg" (no meat/fish/eggs), "non-veg", or "jain-safe"
- "allergens": from [egg, soy, sesame, peanut, shellfish, gluten, dairy] — only those present
- "ingredients": [{"name":"...", "category":"protein|vegetable|sauce|carb|dairy|spice|other", "isUnfamiliar":true/false, "explanation":"brief if unfamiliar else empty"}] — top 4-5 ingredients
- "nutrition": {"protein":g, "carbs":g, "fat":g, "fiber":g, "kcal":num} — approximate
- "explanation": 1 sentence for Indian traveler, relate to Indian food
- "culturalTerms": [{"term":"...", "explanation":"..."}] — 0-2 terms
- "imageSearchQuery": English query to find a photo (e.g. "Korean bibimbap rice bowl")
- "rankScore": 0-30 popularity score

${prefsDescription ? `User preferences: ${prefsDescription}` : ''}

Return JSON: {"dishes": [<array>]}. Be concise.`,
      },
      {
        role: 'user',
        content: `Enrich these dishes:\n${dishList}`,
      },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  const parsed = parseJSON(res)
  return parsed.dishes || []
}

/** Low-level OpenAI API call wrapper. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gptCall(body: Record<string, any>): Promise<string> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

/** Parse JSON with fallback for malformed responses. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSON(content: string): any {
  try {
    return JSON.parse(content)
  } catch {
    const arrayMatch = content.match(/\[[\s\S]*\]/)
    if (arrayMatch) return { dishes: JSON.parse(arrayMatch[0]) }
    throw new Error('Failed to parse menu data')
  }
}
