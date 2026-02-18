const GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY
const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate'

/**
 * Extract text from an image using Google Cloud Vision TEXT_DETECTION.
 * Throws on failure — caller handles fallback to GPT Vision.
 */
export async function extractTextFromImage(imageBase64: string, signal?: AbortSignal): Promise<string> {
  if (!GOOGLE_CLOUD_VISION_API_KEY) {
    throw new Error('GOOGLE_CLOUD_VISION_API_KEY not configured')
  }

  // Strip data URI prefix if present
  const base64Content = imageBase64.replace(/^data:image\/[^;]+;base64,/, '')

  const t = Date.now()
  const res = await fetch(`${VISION_URL}?key=${GOOGLE_CLOUD_VISION_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64Content },
        features: [{ type: 'TEXT_DETECTION' }],
      }],
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[ocr] Cloud Vision failed in ${Date.now() - t}ms: ${res.status} ${err.substring(0, 300)}`)
    throw new Error(`Cloud Vision API error: ${res.status}`)
  }

  const data = await res.json()
  const text = data.responses?.[0]?.fullTextAnnotation?.text || ''
  console.log(`[ocr] Cloud Vision OK in ${Date.now() - t}ms, ${text.length} chars`)

  if (!text.trim()) {
    throw new Error('Cloud Vision returned no text')
  }

  return text
}
