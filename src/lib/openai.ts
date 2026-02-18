import { Dish, Preferences, RawDish, ScanEvent } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const BATCH_SIZE = 3

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

function buildPrefsDescription(preferences: Preferences): string {
  return [
    preferences.diet && `Diet: ${preferences.diet}`,
    preferences.proteins.length > 0 && `Enjoys: ${preferences.proteins.join(', ')}`,
    preferences.spice && `Spice tolerance: ${preferences.spice}`,
    preferences.restrictions.length > 0 && `Restrictions: ${preferences.restrictions.join(', ')}`,
    preferences.allergies.length > 0 && `Allergies: ${preferences.allergies.join(', ')}`,
  ].filter(Boolean).join('. ')
}

/** Streaming pipeline: yields ScanEvent objects as processing progresses. */
export async function* scanMenuStreaming(imageBase64: string, preferences: Preferences, signal?: AbortSignal): AsyncGenerator<ScanEvent> {
  yield { type: 'progress', message: 'Reading menu...' }

  const rawDishes = await extractDishes(imageBase64, signal)

  if (rawDishes.length === 0) {
    yield { type: 'error', message: 'Could not read menu from image. Try a clearer photo.' }
    return
  }

  console.log(`[scan] Phase 1 extracted ${rawDishes.length} dishes:`, rawDishes.map(d => d.nameEnglish).join(', '))

  yield { type: 'progress', message: `Found ${rawDishes.length} dishes` }
  yield { type: 'phase1', dishes: rawDishes }

  const prefsDescription = buildPrefsDescription(preferences)

  // Split into batches
  const batches: RawDish[][] = []
  for (let i = 0; i < rawDishes.length; i += BATCH_SIZE) {
    batches.push(rawDishes.slice(i, i + BATCH_SIZE))
  }

  // Launch batches with stagger to avoid OpenAI returning empty responses under concurrency
  type BatchResult = { batchIdx: number; dishes: Dish[] }
  const t2 = Date.now()
  const STAGGER_MS = 200
  const batchPromises = batches.map((batch, batchIdx) => {
    const startIdx = batchIdx * BATCH_SIZE
    const delay = batchIdx * STAGGER_MS
    return new Promise<BatchResult>((resolve) => {
      setTimeout(() => {
        enrichBatch(batch, prefsDescription, signal).then((dishes) => {
          console.log(`[openai] Batch ${batchIdx} done in ${Date.now() - t2}ms (sent ${batch.length}, got ${dishes.length})`)
          resolve({
            batchIdx,
            dishes: dishes.map((dish, i) => ({ ...dish, id: `dish-${startIdx + i + 1}` })),
          })
        }).catch((err) => {
          console.warn(`[openai] Batch ${batchIdx} failed:`, err?.message || err)
          resolve({ batchIdx, dishes: [] })
        })
      }, delay)
    })
  })

  yield { type: 'progress', message: `Enriching ${rawDishes.length} dishes...` }

  // Yield batches in completion order using channel pattern
  const results: BatchResult[] = []
  let resolveNext: ((r: BatchResult) => void) | null = null

  batchPromises.forEach((p) => {
    p.then((result) => {
      if (resolveNext) {
        const resolve = resolveNext
        resolveNext = null
        resolve(result)
      } else {
        results.push(result)
      }
    })
  })

  for (let i = 0; i < batchPromises.length; i++) {
    const result: BatchResult = results.length > 0
      ? results.shift()!
      : await new Promise<BatchResult>((resolve) => { resolveNext = resolve })
    if (result.dishes.length === 0) continue
    yield { type: 'batch', dishes: result.dishes }
  }

  yield { type: 'done' }
}

/** Phase 1: Vision call — extract just names, prices, local text. Minimal output tokens. */
async function extractDishes(imageBase64: string, signal?: AbortSignal): Promise<RawDish[]> {
  const res = await gptCall({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Extract EVERY single dish/item from this menu image. Do NOT skip any items. Include all sections, categories, and variations. Return JSON: {"dishes":[{"id":"dish-1","nameEnglish":"...","nameLocal":"original script","price":"...","brief":"3 word description","country":"Korea|Thailand|Vietnam|Japan|Indonesia"}]}. Number IDs sequentially. Minimal output but complete coverage.`,
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageBase64, detail: 'auto' } },
          { type: 'text', text: 'Extract ALL dishes from this menu. Do not miss any items.' },
        ],
      },
    ],
    max_tokens: 8192,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }, signal)

  const parsed = parseJSON(res)
  return parsed.dishes || []
}

/** Phase 2: Split dishes into batches, enrich all batches concurrently. */
async function enrichInParallel(rawDishes: RawDish[], preferences: Preferences): Promise<Dish[]> {
  const prefsDescription = buildPrefsDescription(preferences)

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

/** Enrich a single batch of dishes via GPT-4o-mini (no vision needed). Retries missing dishes once. */
async function enrichBatch(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]> {
  const result = await enrichBatchOnce(dishes, prefsDescription, signal)

  // Retry missing dishes once
  if (result.length < dishes.length) {
    const returnedIds = new Set(result.map(d => d.id))
    const missing = dishes.filter(d => !returnedIds.has(d.id))
    if (missing.length > 0) {
      console.log(`[openai] Retrying ${missing.length} missing dishes: ${missing.map(d => d.nameEnglish).join(', ')}`)
      const retryResult = await enrichBatchOnce(missing, prefsDescription, signal)
      result.push(...retryResult)
    }
  }

  return result
}

async function enrichBatchOnce(dishes: RawDish[], prefsDescription: string, signal?: AbortSignal): Promise<Dish[]> {
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
- "description": 1-2 sentences describing the dish — what it looks like, key ingredients, cooking method, and how it tastes
- "country": "${country}"
- "price": as given
- "dietaryType": "veg" (no meat/fish/eggs), "non-veg", or "jain-safe"
- "allergens": from [egg, soy, sesame, peanut, shellfish, gluten, dairy] — only those present
- "ingredients": [{"name":"...", "category":"protein|vegetable|sauce|carb|dairy|spice|other", "isUnfamiliar":true/false, "explanation":"brief if unfamiliar else empty"}] — top 4-5 ingredients
- "nutrition": {"protein":g, "carbs":g, "fat":g, "fiber":g, "kcal":num} — approximate
- "explanation": 2-3 sentences. First: describe what the dish actually is (cooking method, key flavors, how it's served/eaten). Second: compare to a well-known Indian or global dish if a good analogy exists (e.g. "Similar to tandoori chicken..." or "Think of it as a Korean version of biryani..."). Third (optional): a tip or recommendation (e.g. "Best enjoyed with steamed rice" or "Ask for extra sauce on the side").
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
    max_tokens: 8192,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }, signal)

  const parsed = parseJSON(res)
  const result = parsed.dishes || []
  if (result.length < dishes.length) {
    console.warn(`[openai] Enrichment returned ${result.length}/${dishes.length} dishes. Response preview: ${res.substring(0, 200)}`)
  }
  return result
}

/** Low-level OpenAI API call wrapper. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gptCall(body: Record<string, any>, signal?: AbortSignal): Promise<string> {
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
function parseJSON(content: string): any {
  try {
    return JSON.parse(content)
  } catch {
    const arrayMatch = content.match(/\[[\s\S]*\]/)
    if (arrayMatch) return { dishes: JSON.parse(arrayMatch[0]) }
    throw new Error('Failed to parse menu data')
  }
}
