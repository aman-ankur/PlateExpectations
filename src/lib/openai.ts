import { Dish, Preferences, RawDish, ScanEvent } from './types'
import { getPhase1Provider, getEnrichmentProvider, isLazyEnrichment, buildPrefsDescription } from './providers'

const BATCH_SIZE = 3

/**
 * Two-phase parallel pipeline using pluggable providers:
 *   Phase 1: Provider-specific dish extraction (Gemini Flash / Cloud Vision+Groq / GPT Vision)
 *   Phase 2: Provider-specific enrichment in parallel batches (Groq / GPT)
 */
export async function scanMenu(imageBase64: string, preferences: Preferences): Promise<Dish[]> {
  const phase1 = getPhase1Provider()
  const enrichment = getEnrichmentProvider()
  const lazy = isLazyEnrichment()

  console.log(`[openai] Phase 1 (${phase1.name}) starting...`)
  const t1 = Date.now()
  let rawDishes: RawDish[]
  try {
    rawDishes = await phase1.extractDishes(imageBase64)
  } catch {
    if (phase1.name !== 'cloud-vision-groq') {
      console.log(`[openai] ${phase1.name} failed, falling back to cloud-vision-groq`)
      const { cloudVisionGroqProvider } = await import('./providers/cloud-vision-groq')
      try {
        rawDishes = await cloudVisionGroqProvider.extractDishes(imageBase64)
      } catch {
        console.log('[openai] cloud-vision-groq also failed, falling back to gpt-vision')
        const { gptVisionProvider } = await import('./providers/gpt-vision')
        rawDishes = await gptVisionProvider.extractDishes(imageBase64)
      }
    } else {
      console.log('[openai] cloud-vision-groq failed, falling back to gpt-vision')
      const { gptVisionProvider } = await import('./providers/gpt-vision')
      rawDishes = await gptVisionProvider.extractDishes(imageBase64)
    }
  }
  console.log(`[openai] Phase 1 done: ${rawDishes.length} dishes in ${Date.now() - t1}ms`)

  if (rawDishes.length === 0) return []

  const prefsDescription = buildPrefsDescription(preferences)

  // Split into batches and enrich
  const batches: RawDish[][] = []
  for (let i = 0; i < rawDishes.length; i += BATCH_SIZE) {
    batches.push(rawDishes.slice(i, i + BATCH_SIZE))
  }

  console.log(`[openai] Phase 2 (${enrichment.name}, lazy=${lazy}): ${batches.length} batches`)
  const t2 = Date.now()
  const enrichFn = lazy ? enrichment.enrichBatchCard : enrichment.enrichBatch
  const results = await Promise.all(
    batches.map((batch) => enrichFn.call(enrichment, batch, prefsDescription))
  )

  const allDishes = results.flat()
  console.log(`[openai] Phase 2 done: ${allDishes.length} dishes in ${Date.now() - t2}ms`)

  return allDishes.map((dish, i) => ({ ...dish, id: `dish-${i + 1}` }))
}

/** Streaming pipeline: yields ScanEvent objects as processing progresses. */
export async function* scanMenuStreaming(imageBase64: string, preferences: Preferences, signal?: AbortSignal): AsyncGenerator<ScanEvent> {
  const phase1 = getPhase1Provider()
  const enrichment = getEnrichmentProvider()
  const lazy = isLazyEnrichment()

  yield { type: 'progress', message: 'Reading menu...' }

  let rawDishes: RawDish[]
  try {
    rawDishes = await phase1.extractDishes(imageBase64, signal)
  } catch {
    // Fallback chain: primary → cloud-vision-groq → gpt-vision
    if (phase1.name !== 'cloud-vision-groq') {
      console.log(`[scan] ${phase1.name} failed, falling back to cloud-vision-groq`)
      try {
        const { cloudVisionGroqProvider } = await import('./providers/cloud-vision-groq')
        rawDishes = await cloudVisionGroqProvider.extractDishes(imageBase64, signal)
      } catch {
        console.log('[scan] cloud-vision-groq also failed, falling back to gpt-vision')
        const { gptVisionProvider } = await import('./providers/gpt-vision')
        rawDishes = await gptVisionProvider.extractDishes(imageBase64, signal)
      }
    } else {
      console.log('[scan] cloud-vision-groq failed, falling back to gpt-vision')
      const { gptVisionProvider } = await import('./providers/gpt-vision')
      rawDishes = await gptVisionProvider.extractDishes(imageBase64, signal)
    }
  }

  if (rawDishes.length === 0) {
    yield { type: 'error', message: 'Could not read menu from image. Try a clearer photo.' }
    return
  }

  console.log(`[scan] Phase 1 (${phase1.name}) extracted ${rawDishes.length} dishes:`, rawDishes.map(d => d.nameEnglish).join(', '))

  yield { type: 'progress', message: `Found ${rawDishes.length} dishes` }
  yield { type: 'phase1', dishes: rawDishes }

  const prefsDescription = buildPrefsDescription(preferences)
  const enrichFn = lazy ? enrichment.enrichBatchCard : enrichment.enrichBatch

  // Split into batches
  const batches: RawDish[][] = []
  for (let i = 0; i < rawDishes.length; i += BATCH_SIZE) {
    batches.push(rawDishes.slice(i, i + BATCH_SIZE))
  }

  // Launch batches with stagger to avoid empty responses under concurrency
  type BatchResult = { batchIdx: number; dishes: Dish[] }
  const t2 = Date.now()
  const STAGGER_MS = 200
  const batchPromises = batches.map((batch, batchIdx) => {
    const startIdx = batchIdx * BATCH_SIZE
    const delay = batchIdx * STAGGER_MS
    return new Promise<BatchResult>((resolve) => {
      setTimeout(() => {
        const doEnrich = async () => {
          const dishes = await enrichFn.call(enrichment, batch, prefsDescription, signal)
          // Retry missing dishes once
          if (dishes.length < batch.length) {
            const returnedIds = new Set(dishes.map(d => d.id))
            const missing = batch.filter(d => !returnedIds.has(d.id))
            if (missing.length > 0) {
              console.log(`[openai] Retrying ${missing.length} missing dishes`)
              const retry = await enrichFn.call(enrichment, missing, prefsDescription, signal)
              dishes.push(...retry)
            }
          }
          return dishes
        }
        doEnrich().then((dishes) => {
          console.log(`[openai] Batch ${batchIdx} done in ${Date.now() - t2}ms (sent ${batch.length}, got ${dishes.length})`)
          const rawById = new Map(batch.map(d => [d.id, d]))
          resolve({
            batchIdx,
            dishes: dishes.map((dish, i) => {
              const raw = rawById.get(dish.id)
              const romanized = raw?.nameEnglish || ''
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
