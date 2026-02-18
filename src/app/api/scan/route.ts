import { NextRequest, NextResponse } from 'next/server'
import { scanMenu } from '@/lib/openai'
import { rankDishes } from '@/lib/ranking'
import { DEFAULT_PREFERENCES, Preferences } from '@/lib/types'

export const maxDuration = 60

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

    const prefs = preferences || DEFAULT_PREFERENCES
    console.log('[scan] Starting parallel pipeline scan, image size:', Math.round(image.length / 1024), 'KB')
    const startTime = Date.now()

    const dishes = await scanMenu(image, prefs)

    if (dishes.length === 0) {
      return NextResponse.json({ error: 'Could not read menu from image. Try a clearer photo.' }, { status: 422 })
    }

    const ranked = rankDishes(dishes, prefs)
    console.log('[scan] Complete:', dishes.length, 'dishes in', Date.now() - startTime, 'ms')

    return NextResponse.json({ dishes: ranked })
  } catch (err) {
    console.error('[scan] API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
