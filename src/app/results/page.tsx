'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { rankDishes } from '@/lib/ranking'
import { Dish, ScanEvent } from '@/lib/types'

const PHASE1_MESSAGES = [
  'Reading menu...',
  'Scanning for dishes...',
  'Identifying prices...',
  'Detecting language...',
  'Translating items...',
  'Almost there...',
]

function GenerateButton({ dish }: { dish: Dish }) {
  const setDishImage = useStore((s) => s.setDishImage)
  const [generating, setGenerating] = useState(false)

  return (
    <button
      disabled={generating}
      onClick={async (e) => {
        e.stopPropagation()
        setGenerating(true)
        try {
          const res = await fetch('/api/generate-dish-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dishName: dish.nameEnglish, description: dish.description }),
          })
          const data = await res.json()
          if (data.imageUrl) setDishImage(dish.id, data.imageUrl)
        } catch { /* ignore */ }
        setGenerating(false)
      }}
      className="absolute inset-0 flex items-center justify-center bg-pe-elevated/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      title="Generate with AI"
    >
      {generating ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-pe-accent/30 border-t-pe-accent" />
      ) : (
        <span className="text-[10px] font-bold text-pe-accent">✨ AI</span>
      )}
    </button>
  )
}

function DishCard({ dish }: { dish: Dish }) {
  const router = useRouter()
  const imageUrl = useStore((s) => s.dishImages[dish.id])
  const isGenerated = useStore((s) => s.isGeneratedImage(dish.id))

  return (
    <button
      onClick={() => router.push(`/dish/${dish.id}`)}
      className="flex w-full items-center gap-4 rounded-xl border border-pe-border bg-pe-surface p-4 text-left transition-colors hover:border-pe-accent"
    >
      <div className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-pe-elevated">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={dish.nameEnglish} className="h-full w-full object-cover" />
            {isGenerated && (
              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-pe-accent backdrop-blur-sm">
                ✨ AI
              </span>
            )}
          </>
        ) : (
          <>
            <div className="flex h-full items-center justify-center text-2xl">🍽️</div>
            <GenerateButton dish={dish} />
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {dish.rankLabel && (
          <span className="mb-1 inline-block rounded-full bg-pe-tag-rank-bg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pe-tag-rank">
            {dish.rankLabel}
          </span>
        )}
        <h3 className="font-semibold text-pe-text">{dish.nameEnglish}</h3>
        <p className="text-sm text-pe-text-muted">{dish.nameLocal}</p>
        <p className="mt-1 line-clamp-2 text-sm text-pe-text-secondary">
          {dish.description}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-sm font-medium text-pe-text-secondary">{dish.price}</span>
        <svg className="h-4 w-4 text-pe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const {
    dishes, error, menuImage, preferences,
    scanProgress, skeletonDishes,
    setDishes, setLoading, setError, setScanProgress, setSkeletonDishes,
    appendEnrichedDishes, fetchDishImagesForBatch, clearScan,
  } = useStore()

  const [phase1Msg, setPhase1Msg] = useState(0)
  const [sortByReco, setSortByReco] = useState(false)
  const scanStarted = useRef(false)
  const inPhase1 = !!scanProgress && skeletonDishes.length === 0

  useEffect(() => {
    if (!inPhase1) return
    const interval = setInterval(() => {
      setPhase1Msg((i) => (i + 1) % PHASE1_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [inPhase1])

  useEffect(() => {
    if (!menuImage) {
      router.replace('/')
      return
    }

    if (dishes.length > 0 || scanStarted.current) return
    scanStarted.current = true

    const streamScan = async () => {
      setLoading(true)
      setError(null)
      setScanProgress('Starting scan...')

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: menuImage, preferences }),
        })

        if (!res.ok) throw new Error('Failed to analyze menu')
        if (!res.body) throw new Error('No response stream')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const event: ScanEvent = JSON.parse(line)
              switch (event.type) {
                case 'progress':
                  setScanProgress(event.message)
                  break
                case 'phase1':
                  setSkeletonDishes(event.dishes)
                  break
                case 'batch':
                  appendEnrichedDishes(event.dishes)
                  fetchDishImagesForBatch(event.dishes)
                  break
                case 'done': {
                  const allDishes = useStore.getState().dishes
                  const ranked = rankDishes(allDishes, preferences)
                  setDishes(ranked)
                  setSkeletonDishes([])
                  setScanProgress(null)
                  setLoading(false)
                  break
                }
                case 'error':
                  setError(event.message)
                  setLoading(false)
                  break
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
        setScanProgress(null)
      }
    }

    streamScan()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuImage, router])

  const enrichedById = new Map(dishes.map((d) => [d.id, d]))
  const scanDone = !scanProgress && dishes.length > 0
  const totalFound = skeletonDishes.length || dishes.length

  // Sorted dishes for "Recommended" view
  const sortedDishes = useMemo(() => {
    if (!sortByReco) return dishes
    return [...dishes].sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
  }, [dishes, sortByReco])

  return (
    <div className="min-h-screen px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pe-surface"
        >
          <svg className="h-5 w-5 text-pe-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Menu Detected</h1>
          {scanDone && (
            <p className="text-sm text-pe-text-secondary">{dishes.length} items identified</p>
          )}
        </div>
        {scanDone && (
          <button
            onClick={() => { clearScan(); router.push('/') }}
            className="rounded-full bg-pe-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Scan New Menu
          </button>
        )}
      </div>

      {/* Sort toggle */}
      {scanDone && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setSortByReco(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !sortByReco
                ? 'bg-pe-accent text-white'
                : 'bg-pe-surface text-pe-text-secondary hover:text-pe-text'
            }`}
          >
            Menu Order
          </button>
          <button
            onClick={() => setSortByReco(true)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              sortByReco
                ? 'bg-pe-accent text-white'
                : 'bg-pe-surface text-pe-text-secondary hover:text-pe-text'
            }`}
          >
            Recommended
          </button>
        </div>
      )}

      {/* Progress indicator */}
      {scanProgress && (
        <div className="mb-4 flex items-center gap-2 rounded-full bg-pe-surface px-4 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pe-accent opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pe-accent" />
          </span>
          <span className="text-sm text-pe-text-secondary">
            {inPhase1 ? PHASE1_MESSAGES[phase1Msg] : scanProgress}
            {skeletonDishes.length > 0 && ` (${dishes.length}/${totalFound} enriched)`}
          </span>
        </div>
      )}

      {/* Phase 1: menu preview + shimmer placeholders */}
      {inPhase1 && !error && (
        <div className="space-y-4">
          {menuImage && (
            <div className="overflow-hidden rounded-xl border border-pe-border opacity-60">
              <img
                src={menuImage}
                alt="Your menu"
                className="h-48 w-full object-cover"
              />
            </div>
          )}
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-pe-border bg-pe-surface p-4">
              <div className="mb-2 h-4 w-24 rounded bg-pe-elevated" />
              <div className="mb-2 h-5 w-48 rounded bg-pe-elevated" />
              <div className="h-3 w-32 rounded bg-pe-elevated" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-6 text-center">
          <p className="mb-3 text-red-400">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-full bg-pe-accent px-6 py-2 text-sm font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Unified dish list during streaming (skeleton or enriched per dish) */}
      {skeletonDishes.length > 0 && (
        <div className="space-y-3">
          {skeletonDishes.map((raw) => {
            const enriched = enrichedById.get(raw.id)
            if (enriched) return <DishCard key={raw.id} dish={enriched} />

            return (
              <div
                key={raw.id}
                className="flex w-full items-center gap-4 rounded-xl border border-pe-border bg-pe-surface p-4 opacity-50"
              >
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-pe-elevated">
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-pe-border" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-pe-text">{raw.nameEnglish}</h3>
                  <p className="text-sm text-pe-text-muted">{raw.nameLocal}</p>
                  <p className="mt-1 text-sm text-pe-text-secondary">{raw.brief}</p>
                </div>
                <span className="text-sm font-medium text-pe-text-secondary">{raw.price}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Final results (after scan done) */}
      {scanDone && skeletonDishes.length === 0 && (
        <div className="space-y-3">
          {sortedDishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {scanDone && (
        <p className="mt-6 text-center text-[10px] text-pe-text-muted">
          AI-estimated. Verify with restaurant staff.
        </p>
      )}
    </div>
  )
}
