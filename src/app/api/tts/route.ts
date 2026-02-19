import { NextRequest, NextResponse } from 'next/server'
import { buildOrderPhrase } from '@/lib/orderTemplates'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { dishes, country } = await req.json() as {
      dishes: { name: string; quantity: number }[]
      country: string
    }

    if (!dishes || dishes.length === 0) {
      return NextResponse.json({ error: 'No dishes provided' }, { status: 400 })
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 })
    }

    const phrase = buildOrderPhrase(dishes, country)

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'nova',
        input: phrase,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[tts] OpenAI TTS error:', err)
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[tts] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
