'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useStore } from '@/lib/store'
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
  const { dishes, dishImages, addDishImage, isGeneratedImage, order, addToOrder, removeFromOrder, updateQuantity } = useStore()
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null)
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)

  const dish = dishes.find((d) => String(d.id) === String(params.id))
  const images: string[] = dish ? (dishImages[dish.id] || []) : []

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
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {images.map((url, i) => (
                <div key={url} className="relative h-full w-full flex-shrink-0 snap-start">
                  <img src={url} alt={`${dish.nameEnglish} ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            {/* Heavy gradient overlay — fades into page background */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/70 via-40% to-transparent" />
            {/* AI Generated tag — above gradient, bottom-right */}
            {isGeneratedImage(images[currentIndex]) && (
              <span className="absolute bottom-[45%] right-3 z-20 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-pe-accent backdrop-blur-sm">
                AI Generated
              </span>
            )}
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

        {/* Scattered ingredient badges — infographic style (first image only) */}
        {images.length > 0 && currentIndex === 0 && dish.ingredients.length > 0 && dish.ingredients.slice(0, 8).map((ing, i) => (
          <IngredientBadge
            key={ing.name}
            ing={ing}
            position={BADGE_POSITIONS[i]}
            expanded={expandedBadge === ing.name}
            onTap={() => toggleBadge(ing.name)}
          />
        ))}

        {/* Generate more button — inside hero when images exist but < 3 */}
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
            className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-pe-accent backdrop-blur-sm"
          >
            {generating ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-pe-accent/30 border-t-pe-accent" />
            ) : (
              <>✨ + AI</>
            )}
          </button>
        )}

        {/* Hero overlay content — sits inside gradient zone */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-5">
          {/* Country label */}
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-pe-accent">
            {dish.country}
          </p>

          {/* Dish name */}
          <h1 className="text-3xl font-bold text-white">{dish.nameEnglish}</h1>
          {dish.nameRomanized && (
            <p className="mt-0.5 text-lg font-semibold text-white/90">{dish.nameRomanized}</p>
          )}
          {(dish.nameLocalCorrected || dish.nameLocal) && (
            <p className="mt-0.5 text-xl font-medium text-white/70">{dish.nameLocalCorrected || dish.nameLocal}</p>
          )}

          {/* Dietary / allergen tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-full bg-pe-tag-dietary-bg/80 px-3 py-1 text-xs font-medium text-pe-tag-dietary backdrop-blur-sm">
              {dish.dietaryType === 'veg' ? '🟢' : '🔴'} {dish.dietaryType === 'jain-safe' ? 'Jain Safe' : dish.dietaryType === 'veg' ? 'Veg' : 'Non-Veg'}
            </span>
            {dish.allergens.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-pe-tag-allergen-bg/80 px-3 py-1 text-xs font-medium text-pe-tag-allergen backdrop-blur-sm">
                ⚠️ {dish.allergens.join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-pe-tag-macro-bg/80 px-3 py-1 text-xs font-medium text-pe-tag-macro backdrop-blur-sm">
              ⚡ {dish.nutrition.protein > dish.nutrition.carbs ? 'Protein' : 'Carbs'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* What is this dish? */}
        <div className="mb-5 rounded-xl border border-pe-border bg-pe-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-pe-text-secondary">What is this dish?</h2>
          <p className="text-sm leading-relaxed text-pe-text">{dish.explanation}</p>
        </div>

        {/* Nutrition */}
        <div className="mb-5 rounded-xl border border-pe-border bg-pe-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-pe-text-secondary">Approx. Nutrition</h2>
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
              <p className="text-lg font-bold text-blue-400">{dish.nutrition.fiber}g</p>
              <p className="text-[10px] text-pe-text-muted">Fiber</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-pe-text-muted">
            {dish.nutrition.kcal} kcal estimated per serving
          </p>
        </div>

        {/* Ingredients */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-pe-text-secondary">Ingredients</h2>
          <div className="flex flex-wrap gap-2">
            {dish.ingredients.map((ing) => (
              <span
                key={ing.name}
                className="flex items-center gap-1 rounded-full bg-pe-surface border border-pe-border px-3 py-1.5 text-xs text-pe-text"
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
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    expandedTerm === ct.term
                      ? 'border-pe-accent bg-pe-accent/10 text-pe-accent'
                      : 'border-pe-border bg-pe-surface text-pe-text'
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
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-pe-border/50 bg-[#0f0f0f]/95 px-5 py-4 backdrop-blur-md">
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
