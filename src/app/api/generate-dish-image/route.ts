import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

/**
 * POST /api/generate-dish-image
 * Generate a dish photo using DALL-E 3 when no Wikipedia image is available.
 * Input: { dishName: string, description: string }
 * Output: { imageUrl: string }
 */
export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  try {
    const { dishName, description } = await req.json()

    if (!dishName) {
      return NextResponse.json({ error: 'dishName is required' }, { status: 400 })
    }

    const prompt = `A realistic overhead photo of ${dishName}: ${description || dishName}. Food photography, natural lighting, no text or labels.`

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[generate-dish-image] OpenAI error:', err)
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
    }

    const data = await res.json()
    const imageUrl = data.data?.[0]?.url

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 })
    }

    return NextResponse.json({ imageUrl })
  } catch (err) {
    console.error('[generate-dish-image] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}
