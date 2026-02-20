'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { rankDishes } from '@/lib/ranking'
import { convertPrice } from '@/lib/currency'
import { matchFromCache } from '@/lib/cuisine-cache'
import OrderFab from '@/components/OrderFab'
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
  const addDishImage = useStore((s) => s.addDishImage)
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
          if (data.imageUrl) addDishImage(dish.id, data.imageUrl)
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
  const imageUrl = useStore((s) => s.dishImages[dish.id]?.[0])
  const isGenerated = useStore((s) => s.isGeneratedImage(s.dishImages[dish.id]?.[0] || ''))
  const orderQty = useStore((s) => s.order[dish.id] || 0)
  const addToOrder = useStore((s) => s.addToOrder)
  const homeCurrency = useStore((s) => s.preferences.homeCurrency)
  const exchangeRates = useStore((s) => s.exchangeRates)
  const [flash, setFlash] = useState(false)

  return (
    <div
      onClick={() => router.push(`/dish/${dish.id}`)}
      role="button"
      tabIndex={0}
      className={`relative flex w-full items-stretch overflow-hidden rounded-2xl bg-pe-surface text-left transition-all cursor-pointer ${
        flash
          ? 'ring-2 ring-pe-accent shadow-lg shadow-pe-accent/20'
          : 'ring-1 ring-white/[0.06] shadow-md shadow-black/25 hover:shadow-lg hover:shadow-black/35'
      }`}
    >
      {/* Image — full card height, gradient-fades into surface */}
      <div className="group relative w-28 flex-shrink-0">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={dish.nameEnglish} className="h-full w-full object-cover" />
            {isGenerated && (
              <span className="absolute bottom-1.5 right-1.5 z-10 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-pe-accent backdrop-blur-sm">
                AI
              </span>
            )}
          </>
        ) : (
          <>
            <div className="flex h-full min-h-[100px] items-center justify-center bg-pe-elevated text-3xl">🍽️</div>
            <GenerateButton dish={dish} />
          </>
        )}
        {/* Gradient fade — image dissolves into card */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-pe-surface" />
        {orderQty > 0 && (
          <span className="absolute top-2 left-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-md bg-pe-accent px-1 text-[10px] font-bold text-white shadow-sm">
            {orderQty}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 min-w-0 items-center gap-2 py-3 pr-3">
        <div className="flex-1 min-w-0">
          {dish.rankLabel && (
            <span className="mb-1 inline-block rounded-full bg-pe-tag-rank-bg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pe-tag-rank">
              {dish.rankLabel}
            </span>
          )}
          <h3 className="font-semibold text-pe-text">{dish.nameEnglish}</h3>
          <p className="text-sm text-pe-text-muted">
            {dish.nameRomanized && <span className="font-medium text-pe-text-secondary">{dish.nameRomanized} · </span>}
            {dish.nameLocalCorrected || dish.nameLocal}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-pe-text-secondary">
            {dish.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 pl-1">
          <div className="text-right">
            <span className="text-sm font-medium text-pe-text-secondary">{dish.price}</span>
            {(() => {
              const converted = convertPrice(dish.price, dish.country, homeCurrency, exchangeRates)
              return converted ? <p className="text-[11px] text-pe-text-muted">{converted}</p> : null
            })()}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              addToOrder(dish.id)
              setFlash(true)
              setTimeout(() => setFlash(false), 400)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-pe-accent/15 text-pe-accent transition-colors active:bg-pe-accent/30"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
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
  const order = useStore((s) => s.order)
  const exchangeRates = useStore((s) => s.exchangeRates)
  const hasOrder = Object.keys(order).length > 0

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
    useStore.getState().clearOrder()

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
                  // Check offline cache for instant enrichment
                  matchFromCache(event.dishes).then(({ hits, hitImages }) => {
                    if (hits.length > 0) {
                      appendEnrichedDishes(hits)
                      // Set cached images directly (no API call needed)
                      const store = useStore.getState()
                      for (const [dishId, urls] of Object.entries(hitImages)) {
                        store.setDishImages(dishId, urls)
                      }
                    }
                  }).catch(() => {})
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
    <div className={`min-h-screen px-4 py-6 ${hasOrder ? 'pb-20' : ''}`}>
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
                className="flex w-full items-stretch overflow-hidden rounded-2xl bg-pe-surface opacity-50 ring-1 ring-white/[0.06] shadow-md shadow-black/25"
              >
                <div className="w-28 flex-shrink-0 bg-pe-elevated">
                  <div className="flex h-full min-h-[100px] items-center justify-center">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-pe-border" />
                  </div>
                </div>
                <div className="flex flex-1 min-w-0 items-center gap-2 py-3 pr-3 pl-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-pe-text">{raw.nameEnglish}</h3>
                    <p className="text-sm text-pe-text-muted">{raw.nameLocal}</p>
                    <p className="mt-1 text-sm text-pe-text-secondary">{raw.brief}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-pe-text-secondary">{raw.price}</span>
                    {(() => {
                      const converted = convertPrice(raw.price, raw.country, preferences.homeCurrency, exchangeRates)
                      return converted ? <p className="text-[11px] text-pe-text-muted">{converted}</p> : null
                    })()}
                  </div>
                </div>
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

      {/* Add-to-order hint */}
      {scanDone && !hasOrder && (
        <p className="mt-2 text-center text-[10px] text-pe-text-muted">
          Tap + to add dishes to your order.
        </p>
      )}

      <OrderFab />
    </div>
  )
}
