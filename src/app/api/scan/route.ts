import { NextRequest, NextResponse } from 'next/server'
import { extractMenuItems, enrichDishes } from '@/lib/openai'
import { rankDishes } from '@/lib/ranking'
import { Preferences, DEFAULT_PREFERENCES } from '@/lib/types'

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

    // Step 1: OCR — extract menu items from image
    const menuItemsJson = await extractMenuItems(image)

    // Check for OCR error
    try {
      const parsed = JSON.parse(menuItemsJson)
      if (parsed.error) {
        return NextResponse.json({ error: 'Could not read menu from image. Try a clearer photo.' }, { status: 422 })
      }
      // Normalize to items array string for enrichment
      const items = parsed.items || parsed
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'No menu items found. Try a different photo.' }, { status: 422 })
      }
    } catch {
      // If JSON parsing fails, pass raw text to enrichment anyway
    }

    // Step 2: Translate & enrich
    const prefs = preferences || DEFAULT_PREFERENCES
    const dishes = await enrichDishes(menuItemsJson, JSON.stringify(prefs))

    // Step 3: Rank by preferences
    const ranked = rankDishes(dishes, prefs)

    return NextResponse.json({ dishes: ranked })
  } catch (err) {
    console.error('Scan API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
