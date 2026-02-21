import { Phase1Provider } from './types'
import { RawDish } from '../types'
import { gptCall, parseJSON, VISION_EXTRACTION_SYSTEM_PROMPT } from './shared'

/** Phase 1 fallback: GPT-4o-mini Vision — extract dishes directly from image */
export const gptVisionProvider: Phase1Provider = {
  name: 'gpt-vision',

  async extractDishes(imageBase64: string, signal?: AbortSignal): Promise<RawDish[]> {
    const t = Date.now()
    const res = await gptCall({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: VISION_EXTRACTION_SYSTEM_PROMPT },
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
    const dishes = parsed.dishes || []
    console.log(`[gpt-vision] Done: ${dishes.length} dishes in ${Date.now() - t}ms`)
    return dishes
  },
}
