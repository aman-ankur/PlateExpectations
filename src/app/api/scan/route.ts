import { NextRequest, NextResponse } from 'next/server'
import { extractMenuItems, enrichDishes } from '@/lib/openai'
import { rankDishes } from '@/lib/ranking'
import { Preferences, DEFAULT_PREFERENCES } from '@/lib/types'

// Increase body size limit for large base64 images
export const maxDuration = 60 // seconds (Vercel serverless timeout)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, preferences }: { image: string; preferences?: Preferences } = body

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('[scan] Starting OCR, image size:', Math.round(image.length / 1024), 'KB')

    // Step 1: OCR — extract menu items from image
    const menuItemsJson = await extractMenuItems(image)
    console.log('[scan] OCR complete, extracting items...')

    // Check for OCR error
    try {
      const parsed = JSON.parse(menuItemsJson)
      if (parsed.error) {
        return NextResponse.json({ error: 'Could not read menu from image. Try a clearer photo.' }, { status: 422 })
      }
      const items = parsed.items || parsed
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'No menu items found. Try a different photo.' }, { status: 422 })
      }
      console.log('[scan] Found', items.length, 'menu items')
    } catch {
      console.log('[scan] OCR response not JSON, passing raw to enrichment')
    }

    // Step 2: Translate & enrich
    console.log('[scan] Starting enrichment...')
    const prefs = preferences || DEFAULT_PREFERENCES
    const dishes = await enrichDishes(menuItemsJson, JSON.stringify(prefs))
    console.log('[scan] Enrichment complete,', dishes.length, 'dishes')

    // Step 3: Rank by preferences
    const ranked = rankDishes(dishes, prefs)

    return NextResponse.json({ dishes: ranked })
  } catch (err) {
    console.error('[scan] API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
