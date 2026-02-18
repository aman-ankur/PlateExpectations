import { Dish, Preferences, RawDish, ScanEvent } from './types'
import { extractTextFromImage } from './ocr'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
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
          // Preserve Phase 1 romanized name (e.g. "JJAJANGMYEON") before enrichment overwrites nameEnglish
          const rawById = new Map(batch.map(d => [d.id, d]))
          resolve({
            batchIdx,
            dishes: dishes.map((dish, i) => {
              const raw = rawById.get(dish.id)
              const romanized = raw?.nameEnglish || ''
              // Only set nameRomanized if it differs from the enriched English name
              const nameRomanized = romanized && romanized.toLowerCase() !== dish.nameEnglish.toLowerCase()
                ? romanized : undefined
              return { ...dish, nameRomanized, id: `dish-${startIdx + i + 1}` }
            }),
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

/** Phase 1: Try fast OCR path first, fall back to GPT Vision. */
async function extractDishes(imageBase64: string, signal?: AbortSignal): Promise<RawDish[]> {
  // Fast path: Cloud Vision OCR → GPT text parsing
  try {
    const t = Date.now()
    const ocrText = await extractTextFromImage(imageBase64, signal)
    console.log(`[ocr] Fast path: got ${ocrText.length} chars, parsing with GPT...`)
    const dishes = await extractDishesFromText(ocrText, signal)
    if (dishes.length > 0) {
      console.log(`[ocr] Fast path complete: ${dishes.length} dishes in ${Date.now() - t}ms`)
      return dishes
    }
    console.log('[ocr] Fast path returned 0 dishes, falling back to Vision')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[ocr] Fast path failed (${msg}), falling back to Vision`)
  }

  // Fallback: GPT Vision
  return extractDishesVision(imageBase64, signal)
}

/** Backfill empty nameLocal from OCR text. Llama models sometimes omit non-Latin scripts in JSON. */
function backfillNameLocal(dishes: RawDish[], ocrText: string): RawDish[] {
  return dishes.map((dish) => {
    if (dish.nameLocal && dish.nameLocal.trim()) return dish
    // Try to find a matching non-Latin token by checking if the English name romanization
    // appears near it in the OCR text. Simple heuristic: find the first unused non-Latin
    // token on a line containing the price or English name.
    const engLower = dish.nameEnglish.toLowerCase().replace(/\s+/g, '')
    const lines = ocrText.split('\n')
    for (const line of lines) {
      const lineNonLatin = line.match(/[^\x00-\x7F\s]+(?:\s*[^\x00-\x7F\s]+)*/g)
      if (!lineNonLatin) continue
      // Check if this line has the price or a partial English match
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

/** Fast text-only call to parse OCR text into dishes. Tries Groq first (10x faster), falls back to GPT. */
async function extractDishesFromText(ocrText: string, signal?: AbortSignal): Promise<RawDish[]> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are given OCR text from a restaurant menu. Extract EVERY dish/item. Do NOT skip any items. Include all sections, categories, and variations. Return JSON: {"dishes":[{"id":"dish-1","nameEnglish":"...","nameLocal":"original script in native characters (e.g. 김치전, ผัดไทย). If the menu is only in English, infer the native script from the dish name and country.","price":"...","brief":"3 word description","country":"Korea|Thailand|Vietnam|Japan|Indonesia"}]}. Number IDs sequentially. Minimal output but complete coverage.`,
    },
    {
      role: 'user' as const,
      content: `Extract ALL dishes from this menu text:\n\n${ocrText}`,
    },
  ]

  // Try Groq first (Llama 3.3 70B at ~400-500 tok/s)
  if (GROQ_API_KEY) {
    try {
      const res = await groqCall({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 4096,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }, signal)
      const parsed = parseJSON(res)
      const dishes = parsed.dishes || []
      if (dishes.length > 0) return backfillNameLocal(dishes, ocrText)
      console.log('[groq] Returned 0 dishes, falling back to GPT')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[groq] Failed (${msg}), falling back to GPT`)
    }
  }

  // Fallback: GPT-4o-mini
  const res = await gptCall({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 4096,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }, signal)

  const parsed = parseJSON(res)
  return parsed.dishes || []
}

/** Fallback: GPT Vision call — extract dishes directly from image. */
async function extractDishesVision(imageBase64: string, signal?: AbortSignal): Promise<RawDish[]> {
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

  const messages = [
    {
      role: 'system' as const,
      content: `You enrich ${country} restaurant dishes for Indian travelers.

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

Return JSON: {"dishes": [<array>]}. Be concise.`,
    },
    {
      role: 'user' as const,
      content: `Enrich these dishes:\n${dishList}`,
    },
  ]

  const callParams = { messages, max_tokens: 8192, temperature: 0.2, response_format: { type: 'json_object' } }

  // Try Groq first (Llama 3.3 70B — 8x faster enrichment)
  if (GROQ_API_KEY) {
    try {
      const res = await groqCall({ model: 'llama-3.3-70b-versatile', ...callParams }, signal)
      const parsed = parseJSON(res)
      const result = parsed.dishes || []
      if (result.length > 0) {
        if (result.length < dishes.length) {
          console.warn(`[groq] Enrichment returned ${result.length}/${dishes.length} dishes`)
        }
        return result
      }
      console.log('[groq] Enrichment returned 0 dishes, falling back to GPT')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[groq] Enrichment failed (${msg}), falling back to GPT`)
    }
  }

  // Fallback: GPT-4o-mini
  const res = await gptCall({ model: 'gpt-4o-mini', ...callParams }, signal)
  const parsed = parseJSON(res)
  const result = parsed.dishes || []
  if (result.length < dishes.length) {
    console.warn(`[openai] Enrichment returned ${result.length}/${dishes.length} dishes. Response preview: ${res.substring(0, 200)}`)
  }
  return result
}

/** Low-level Groq API call wrapper (OpenAI-compatible). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function groqCall(body: Record<string, any>, signal?: AbortSignal): Promise<string> {
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
