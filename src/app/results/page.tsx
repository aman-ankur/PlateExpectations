'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function ResultsPage() {
  const router = useRouter()
  const { dishes, isLoading, error, menuImage, preferences, setDishes, setLoading, setError } = useStore()

  useEffect(() => {
    if (!menuImage) {
      router.replace('/')
      return
    }

    const scanMenu = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: menuImage, preferences }),
        })
        if (!res.ok) throw new Error('Failed to analyze menu')
        const data = await res.json()
        setDishes(data.dishes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    scanMenu()
  }, [menuImage, router, setDishes, setLoading, setError])

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
        <div>
          <h1 className="text-xl font-bold">Menu Detected</h1>
          {!isLoading && dishes.length > 0 && (
            <p className="text-sm text-pe-text-secondary">{dishes.length} items identified</p>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-pe-border bg-pe-surface p-4">
              <div className="mb-2 h-4 w-24 rounded bg-pe-elevated" />
              <div className="mb-2 h-5 w-48 rounded bg-pe-elevated" />
              <div className="h-3 w-32 rounded bg-pe-elevated" />
            </div>
          ))}
          <p className="mt-4 text-center text-sm text-pe-text-muted">
            Analyzing your menu...
          </p>
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

      {/* Results */}
      {!isLoading && !error && dishes.length > 0 && (
        <div className="space-y-3">
          {dishes.map((dish, index) => (
            <button
              key={dish.id}
              onClick={() => router.push(`/dish/${dish.id}`)}
              className="flex w-full items-center gap-4 rounded-xl border border-pe-border bg-pe-surface p-4 text-left transition-colors hover:border-pe-accent"
            >
              <div className="flex-1">
                {dish.rankLabel && (
                  <span className="mb-1 inline-block rounded-full bg-pe-tag-rank-bg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pe-tag-rank">
                    {index === 0 ? 'Top Pick For You' : `#${index + 1} For You`}
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
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {!isLoading && dishes.length > 0 && (
        <p className="mt-6 text-center text-[10px] text-pe-text-muted">
          AI-estimated. Verify with restaurant staff.
        </p>
      )}
    </div>
  )
}
