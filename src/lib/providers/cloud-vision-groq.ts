import { Phase1Provider } from './types'
import { RawDish } from '../types'
import { extractTextFromImage } from '../ocr'
import { groqCall, gptCall, parseJSON, backfillNameLocal, EXTRACTION_SYSTEM_PROMPT, GROQ_API_KEY } from './shared'

/** Phase 1: Cloud Vision OCR → Groq/GPT text parsing */
export const cloudVisionGroqProvider: Phase1Provider = {
  name: 'cloud-vision-groq',

  async extractDishes(imageBase64: string, signal?: AbortSignal): Promise<RawDish[]> {
    const t = Date.now()
    const ocrText = await extractTextFromImage(imageBase64, signal)
    console.log(`[cloud-vision-groq] OCR got ${ocrText.length} chars, parsing...`)

    const messages = [
      { role: 'system' as const, content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user' as const, content: `Extract ALL dishes from this menu text:\n\n${ocrText}` },
    ]

    const callParams = { messages, max_tokens: 4096, temperature: 0.2, response_format: { type: 'json_object' } }

    // Try Groq first
    if (GROQ_API_KEY) {
      try {
        const res = await groqCall({ model: 'llama-3.3-70b-versatile', ...callParams }, signal)
        const parsed = parseJSON(res)
        const dishes = parsed.dishes || []
        if (dishes.length > 0) {
          console.log(`[cloud-vision-groq] Done: ${dishes.length} dishes in ${Date.now() - t}ms`)
          return backfillNameLocal(dishes, ocrText)
        }
        console.log('[cloud-vision-groq] Groq returned 0 dishes, falling back to GPT')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`[cloud-vision-groq] Groq failed (${msg}), falling back to GPT`)
      }
    }

    // Fallback: GPT-4o-mini
    const res = await gptCall({ model: 'gpt-4o-mini', ...callParams }, signal)
    const parsed = parseJSON(res)
    const dishes = parsed.dishes || []
    console.log(`[cloud-vision-groq] GPT fallback: ${dishes.length} dishes in ${Date.now() - t}ms`)
    return dishes
  },
}
