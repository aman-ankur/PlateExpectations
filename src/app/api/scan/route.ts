import { NextRequest, NextResponse } from 'next/server'
import { scanMenuStreaming } from '@/lib/openai'
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
    console.log('[scan] Starting streaming pipeline, image size:', Math.round(image.length / 1024), 'KB')

    const generator = scanMenuStreaming(image, prefs)
    const encoder = new TextEncoder()
    let closed = false

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await generator.next()
          if (done || closed) {
            if (!closed) {
              closed = true
              controller.close()
            }
            return
          }
          controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'))
        } catch (err) {
          if (!closed) {
            const message = err instanceof Error ? err.message : 'Internal server error'
            console.error('[scan] Stream error:', err)
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message }) + '\n'))
            closed = true
            controller.close()
          }
        }
      },
      cancel() {
        closed = true
        generator.return(undefined)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[scan] API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
