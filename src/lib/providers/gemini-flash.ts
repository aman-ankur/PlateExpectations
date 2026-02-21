import { Phase1Provider } from './types'
import { RawDish } from '../types'
import { parseJSON, VISION_EXTRACTION_SYSTEM_PROMPT } from './shared'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

/** Phase 1: Gemini 2.0 Flash — single vision call, no separate OCR step */
export const geminiFlashProvider: Phase1Provider = {
  name: 'gemini',

  async extractDishes(imageBase64: string, signal?: AbortSignal): Promise<RawDish[]> {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

    const t = Date.now()
    // Strip data URI prefix to get raw base64
    const base64Match = imageBase64.match(/^data:image\/([^;]+);base64,(.+)$/)
    const mimeType = base64Match ? `image/${base64Match[1]}` : 'image/jpeg'
    const base64Content = base64Match ? base64Match[2] : imageBase64

    const body = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Content,
            },
          },
          {
            text: `${VISION_EXTRACTION_SYSTEM_PROMPT}\n\nExtract ALL dishes from this menu image. Do not miss any items.`,
          },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    }

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[gemini] FAILED in ${Date.now() - t}ms: ${res.status} ${err.substring(0, 300)}`)
      throw new Error(`Gemini API error: ${res.status} ${err}`)
    }

    const data = await res.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log(`[gemini] OK in ${Date.now() - t}ms, len=${content.length}`)

    const parsed = parseJSON(content)
    const dishes: RawDish[] = parsed.dishes || []
    console.log(`[gemini] Extracted ${dishes.length} dishes in ${Date.now() - t}ms`)
    return dishes
  },
}
