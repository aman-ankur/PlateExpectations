'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getDishConflicts } from '@/lib/ranking'
import type { CulturalTerm, Ingredient } from '@/lib/types'

const BADGE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  protein: { bg: 'bg-black/30', border: 'border-pe-badge-protein/30', dot: 'bg-pe-badge-protein/70' },
  vegetable: { bg: 'bg-black/30', border: 'border-pe-badge-vegetable/30', dot: 'bg-pe-badge-vegetable/70' },
  sauce: { bg: 'bg-black/30', border: 'border-pe-badge-sauce/30', dot: 'bg-pe-badge-sauce/70' },
  carb: { bg: 'bg-black/30', border: 'border-pe-badge-carb/30', dot: 'bg-pe-badge-carb/70' },
  dairy: { bg: 'bg-black/30', border: 'border-pe-badge-sauce/30', dot: 'bg-pe-badge-sauce/70' },
  spice: { bg: 'bg-black/30', border: 'border-pe-badge-protein/30', dot: 'bg-pe-badge-protein/70' },
  other: { bg: 'bg-black/30', border: 'border-white/10', dot: 'bg-white/40' },
}

// Scattered positions — spread into 3 rows × alternating left/right, no overlaps
// Avoids top-left (back button zone) and bottom 45% (gradient text overlay)
const BADGE_POSITIONS = [
  'top-[5%] right-[4%]',
  'top-[5%] left-[28%]',
  'top-[20%] left-[3%]',
  'top-[20%] right-[22%]',
  'top-[35%] right-[3%]',
  'top-[35%] left-[18%]',
  'top-[11%] right-[42%]',
  'top-[28%] left-[42%]',
]

function IngredientBadge({ ing, position, expanded, onTap }: { ing: Ingredient; position: string; expanded: boolean; onTap: () => void }) {
  const colors = BADGE_COLORS[ing.category] || BADGE_COLORS.other
  return (
    <button
      onClick={onTap}
      className={`absolute ${position} z-10 flex flex-col items-start gap-0.5 transition-all duration-200`}
    >
      <span
        className={`flex items-center gap-1.5 rounded-lg border ${colors.border} ${colors.bg} px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md`}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${colors.dot} ring-1 ring-white/30`} />
        {ing.name}
        {ing.isUnfamiliar && (
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20 text-[8px] font-bold">?</span>
        )}
      </span>
      {expanded && ing.isUnfamiliar && ing.explanation && (
        <span className="ml-1 mt-0.5 max-w-[180px] rounded-lg bg-black/80 px-2.5 py-1.5 text-[10px] leading-snug text-white/90 shadow-xl backdrop-blur-md">
          {ing.explanation}
        </span>
      )}
    </button>
  )
}

export default function DishDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { dishes, dishImages, addDishImage, isGeneratedImage, order, addToOrder, removeFromOrder, updateQuantity, mergeDishDetail, preferences } = useStore()
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null)
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBadges, setShowBadges] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const galleryRef = useRef<HTMLDivElement>(null)

  const dish = dishes.find((d) => String(d.id) === String(params.id))
  const images: string[] = dish ? (dishImages[dish.id] || []) : []

  // Lazy load Tier 2 detail data if not yet available
  const needsDetail = dish && dish.ingredients.length === 0 && !dish.explanation
  useEffect(() => {
    if (!needsDetail || !dish || detailLoading) return
    setDetailLoading(true)
    fetch('/api/enrich-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dishes: [{
          id: dish.id,
          nameEnglish: dish.nameEnglish,
          nameLocal: dish.nameLocal,
          brief: dish.description || '',
          country: dish.country,
        }],
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const detail = data.dishes?.[0]
        if (detail) mergeDishDetail(dish.id, detail)
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [needsDetail, dish?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const el = galleryRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setCurrentIndex(idx)
  }, [])

  if (!dish) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-pe-text-secondary">Dish not found</p>
          <button
            onClick={() => router.push('/results')}
            className="rounded-full bg-pe-accent px-6 py-2 text-sm font-semibold text-white"
          >
            Back to Results
          </button>
        </div>
      </div>
    )
  }

  const toggleTerm = (term: string) =>
    setExpandedTerm(expandedTerm === term ? null : term)

  const toggleBadge = (name: string) =>
    setExpandedBadge(expandedBadge === name ? null : name)

  return (
    <div className="min-h-screen pb-28">
      {/* Immersive Hero */}
      <div className="relative h-[55vh] min-h-[320px] w-full bg-pe-elevated">
        {images.length > 0 ? (
          <>
            <div
              ref={galleryRef}
              onScroll={handleScroll}
              onClick={() => setShowBadges((v) => !v)}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {images.map((url, i) => (
                <div key={url} className="relative h-full w-full flex-shrink-0 snap-start">
                  <img src={url} alt={`${dish.nameEnglish} ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            {/* Gradient overlay — tight bottom scrim for text legibility */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-[40%]"
              style={{
                background: `linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)`,
              }}
            />
            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === currentIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <span className="text-6xl">🍽️</span>
            <button
              disabled={generating}
              onClick={async () => {
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
              className="flex items-center gap-1.5 rounded-full bg-pe-accent/90 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-pe-accent"
            >
              {generating ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating...
                </>
              ) : (
                <>
                  <span className="text-sm">✨</span>
                  Generate with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* Back button — z-30 so it's always on top */}
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scattered ingredient badges — hidden by default, tap image to toggle */}
        {images.length > 0 && currentIndex === 0 && dish.ingredients.length > 0 && (
          <div className={`transition-opacity duration-300 ${showBadges ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {dish.ingredients.slice(0, 8).map((ing, i) => (
              <IngredientBadge
                key={ing.name}
                ing={ing}
                position={BADGE_POSITIONS[i]}
                expanded={expandedBadge === ing.name}
                onTap={() => toggleBadge(ing.name)}
              />
            ))}
          </div>
        )}
        {/* Hint to tap for ingredients — shown briefly when badges hidden */}
        {images.length > 0 && !showBadges && dish.ingredients.length > 0 && (
          <div className="absolute top-4 right-4 z-20 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm">
            Tap image for ingredients
          </div>
        )}

        {/* Hero overlay content — compact, sits inside gradient zone */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4">
          {/* Country label */}
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-pe-accent" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
            {dish.country}
          </p>

          {/* Dish name */}
          <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{dish.nameEnglish}</h1>
          {(dish.nameRomanized || dish.nameLocalCorrected || dish.nameLocal) && (
            <p className="mt-0.5 text-sm text-white/80" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
              {dish.nameRomanized && <span className="font-medium text-white/90">{dish.nameRomanized}</span>}
              {dish.nameRomanized && (dish.nameLocalCorrected || dish.nameLocal) && ' · '}
              {dish.nameLocalCorrected || dish.nameLocal}
            </p>
          )}

          {/* Dietary / allergen / AI tags */}
          <div className="mt-2 flex flex-wrap gap-1.5 [&>span]:shadow-sm">
            <span className="flex items-center gap-1 rounded-full bg-pe-tag-dietary-bg px-2.5 py-0.5 text-[10px] font-medium text-pe-tag-dietary backdrop-blur-sm">
              {dish.dietaryType === 'veg' ? '🟢' : '🔴'} {dish.dietaryType === 'jain-safe' ? 'Jain Safe' : dish.dietaryType === 'veg' ? 'Veg' : 'Non-Veg'}
            </span>
            {(dish.spiceLevel ?? 0) >= 1 && (
              <span className="flex items-center gap-1 rounded-full bg-pe-tag-spice-bg px-2.5 py-0.5 text-[10px] font-medium text-pe-tag-spice backdrop-blur-sm">
                {Array.from({ length: Math.min(dish.spiceLevel!, 5) }).map((_, i) => (
                  <svg key={i} className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.3 0-7-2.4-7-8 0-3.2 1.9-6.3 4-8.2.4-.3.9-.1 1 .4.3 1.2.9 2.3 1.7 3.2C13 8.4 13 5.2 12.5 2.5c-.1-.5.4-.8.8-.5C17 4.7 20 9.3 20 15c0 5.6-4.3 8-8 8z"/></svg>
                ))}
                <span>{dish.spiceLevel! <= 1 ? 'Mild' : dish.spiceLevel! <= 2 ? 'Low' : dish.spiceLevel! <= 3 ? 'Medium' : dish.spiceLevel! <= 4 ? 'Hot' : 'Very Hot'}</span>
              </span>
            )}
            {dish.allergens.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-pe-tag-allergen-bg px-2.5 py-0.5 text-[10px] font-medium text-pe-tag-allergen backdrop-blur-sm">
                ⚠️ {dish.allergens.join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-pe-tag-macro-bg px-2.5 py-0.5 text-[10px] font-medium text-pe-tag-macro backdrop-blur-sm">
              ⚡ {dish.nutrition.protein > dish.nutrition.carbs ? 'Protein' : 'Carbs'}
            </span>
            {isGeneratedImage(images[currentIndex]) && (
              <span className="flex items-center gap-1 rounded-full bg-pe-accent/30 px-2.5 py-0.5 text-[10px] font-semibold text-pe-accent backdrop-blur-sm">
                ✨ AI Generated
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* Allergen/dietary conflict warning */}
        {(() => {
          const conflicts = getDishConflicts(dish, preferences)
          return conflicts.length > 0 ? (
            <div className="mb-4 rounded-xl border border-pe-tag-allergen/30 bg-pe-tag-allergen-bg p-3">
              <p className="text-xs font-semibold text-pe-tag-allergen">⚠️ Dietary Conflict</p>
              {conflicts.map((c) => (
                <p key={c} className="mt-0.5 text-xs text-pe-tag-allergen/80">{c}</p>
              ))}
            </div>
          ) : null
        })()}
        {/* Generate more images — below hero, clean placement */}
        {images.length > 0 && images.length < 3 && (
          <button
            disabled={generating}
            onClick={async () => {
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
            className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-pe-surface py-2.5 text-xs font-medium text-pe-text-secondary shadow-pe-card transition-colors active:bg-pe-elevated"
          >
            {generating ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-pe-accent/30 border-t-pe-accent" />
                Generating image...
              </>
            ) : (
              <>
                <span className="text-sm text-pe-accent">✨</span>
                Generate AI Photo
              </>
            )}
          </button>
        )}

        {/* What is this dish? */}
        <div className="mb-5 rounded-xl bg-pe-surface p-4 shadow-pe-card">
          <h2 className="mb-2 text-sm font-semibold text-pe-text-secondary">What is this dish?</h2>
          {dish.explanation ? (
            <p className="text-sm leading-relaxed text-pe-text">{dish.explanation}</p>
          ) : detailLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-full rounded bg-pe-elevated" />
              <div className="h-3 w-3/4 rounded bg-pe-elevated" />
            </div>
          ) : (
            <p className="text-sm text-pe-text-muted">No details available yet.</p>
          )}
        </div>

        {/* Taste Profile */}
        {dish.tasteProfile && dish.tasteProfile.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {dish.tasteProfile.map((taste) => (
              <span key={taste} className="rounded-full bg-pe-surface px-3 py-1 text-xs text-pe-text-secondary capitalize shadow-pe-card">
                {taste}
              </span>
            ))}
          </div>
        )}

        {/* Nutrition */}
        <div className="mb-5 rounded-xl bg-pe-surface p-4 shadow-pe-card">
          <h2 className="mb-3 text-sm font-semibold text-pe-text-secondary">Approx. Nutrition</h2>
          {dish.nutrition.kcal > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-pe-badge-vegetable">{dish.nutrition.protein}g</p>
                  <p className="text-[10px] text-pe-text-muted">Protein</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-pe-tag-allergen">{dish.nutrition.carbs}g</p>
                  <p className="text-[10px] text-pe-text-muted">Carbs</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-pe-badge-protein">{dish.nutrition.fat}g</p>
                  <p className="text-[10px] text-pe-text-muted">Fat</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-pe-teal">{dish.nutrition.fiber}g</p>
                  <p className="text-[10px] text-pe-text-muted">Fiber</p>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-pe-text-muted">
                {dish.nutrition.kcal} kcal estimated per serving
              </p>
            </>
          ) : detailLoading ? (
            <div className="grid grid-cols-4 gap-2 animate-pulse">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="h-5 w-8 rounded bg-pe-elevated" />
                  <div className="h-2 w-10 rounded bg-pe-elevated" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-pe-text-muted">Loading nutrition data...</p>
          )}
        </div>

        {/* Ingredients */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-pe-text-secondary">Ingredients</h2>
          {dish.ingredients.length > 0 ? (
            <>
            <div className="flex flex-wrap gap-2">
              {dish.ingredients.map((ing) => (
              <span
                key={ing.name}
                className="flex items-center gap-1 rounded-full bg-pe-surface px-3 py-1.5 text-xs text-pe-text shadow-pe-card"
              >
                {ing.name}
                {ing.isUnfamiliar && (
                  <button
                    onClick={() => toggleTerm(ing.name)}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pe-text-muted/30 text-[9px] font-bold text-pe-text-secondary"
                  >
                    ?
                  </button>
                )}
              </span>
            ))}
          </div>
          {expandedTerm && (
            <div className="mt-2 rounded-lg bg-pe-elevated p-3 text-xs text-pe-text-secondary">
              {dish.ingredients.find((i) => i.name === expandedTerm)?.explanation ||
                dish.culturalTerms.find((t) => t.term === expandedTerm)?.explanation ||
                'No explanation available.'}
            </div>
          )}
          </>) : detailLoading ? (
            <div className="flex flex-wrap gap-2 animate-pulse">
              {[0,1,2,3].map(i => (
                <div key={i} className="h-7 w-20 rounded-full bg-pe-elevated" />
              ))}
            </div>
          ) : null}
        </div>

        {/* Cultural Terms */}
        {dish.culturalTerms.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-pe-text-secondary">
              Unfamiliar Terms? Tap to Learn
            </h2>
            <div className="flex flex-wrap gap-2">
              {dish.culturalTerms.map((ct: CulturalTerm) => (
                <button
                  key={ct.term}
                  onClick={() => toggleTerm(ct.term)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors ${
                    expandedTerm === ct.term
                      ? 'bg-pe-accent/10 text-pe-accent shadow-pe-card'
                      : 'bg-pe-surface text-pe-text shadow-pe-card'
                  }`}
                >
                  {ct.term}
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pe-text-muted/30 text-[9px] font-bold">
                    ?
                  </span>
                </button>
              ))}
            </div>
            {expandedTerm && dish.culturalTerms.find((t) => t.term === expandedTerm) && (
              <div className="mt-2 rounded-lg bg-pe-elevated p-3 text-xs text-pe-text-secondary">
                {dish.culturalTerms.find((t) => t.term === expandedTerm)?.explanation}
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-pe-text-muted">
          AI-estimated. Verify with restaurant staff.
        </p>
      </div>

      {/* Sticky add-to-order bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-pe-border/50 px-5 py-4 backdrop-blur-md"
        style={{ backgroundColor: 'var(--pe-sticky-bg)' }}
      >
        {order[dish.id] ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => order[dish.id] <= 1 ? removeFromOrder(dish.id) : updateQuantity(dish.id, order[dish.id] - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-pe-elevated text-pe-text"
              >
                {order[dish.id] <= 1 ? (
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) : (
                  <span className="text-lg font-bold">−</span>
                )}
              </button>
              <span className="w-8 text-center text-lg font-bold text-pe-text">{order[dish.id]}</span>
              <button
                onClick={() => updateQuantity(dish.id, order[dish.id] + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-pe-elevated text-pe-text"
              >
                <span className="text-lg font-bold">+</span>
              </button>
            </div>
            <button
              onClick={() => addToOrder(dish.id)}
              className="flex-1 rounded-2xl bg-pe-accent py-3 text-sm font-semibold text-white"
            >
              Add Another
            </button>
          </div>
        ) : (
          <button
            onClick={() => addToOrder(dish.id)}
            className="w-full rounded-2xl bg-pe-accent py-3 text-sm font-semibold text-white"
          >
            Add to Order
          </button>
        )}
        {Object.values(order).reduce((sum, qty) => sum + qty, 0) > 0 && (
          <button
            onClick={() => router.push('/order')}
            className="mt-2 w-full text-center text-xs font-medium text-pe-accent"
          >
            View Order →
          </button>
        )}
      </div>
    </div>
  )
}
