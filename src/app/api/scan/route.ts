import { NextRequest, NextResponse } from 'next/server'
import { scanMenuStreaming } from '@/lib/openai'
import { DEFAULT_PREFERENCES, Preferences } from '@/lib/types'

export const maxDuration = 60

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(req: NextRequest) {
  try {
    // Demo mode: replay fixture data instead of calling external APIs
    if (process.env.DEMO_MODE === 'true') {
      const { events } = (await import('@/fixtures/demo-scan.json'))
      const encoder = new TextEncoder()
      let i = 0
      const stream = new ReadableStream({
        async pull(controller) {
          if (i >= events.length) {
            controller.close()
            return
          }
          controller.enqueue(encoder.encode(JSON.stringify(events[i]) + '\n'))
          const type = events[i].type
          i++
          if (type === 'phase1') await delay(800)
          else if (type === 'batch') await delay(600)
          else await delay(200)
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      })
    }

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

    const abortController = new AbortController()
    const generator = scanMenuStreaming(image, prefs, abortController.signal)
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
            if (err instanceof Error && err.name === 'AbortError') {
              console.log('[scan] Stream aborted by client')
            } else {
              console.error('[scan] Stream error:', err)
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message }) + '\n'))
            }
            closed = true
            controller.close()
          }
        }
      },
      cancel() {
        closed = true
        abortController.abort()
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
