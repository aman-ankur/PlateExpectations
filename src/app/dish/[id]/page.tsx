'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { CulturalTerm } from '@/lib/types'

const BADGE_COLORS: Record<string, string> = {
  protein: 'bg-pe-badge-protein',
  vegetable: 'bg-pe-badge-vegetable',
  sauce: 'bg-pe-badge-sauce',
  carb: 'bg-pe-badge-carb',
  dairy: 'bg-pe-badge-sauce',
  spice: 'bg-pe-badge-protein',
  other: 'bg-pe-text-muted',
}

export default function DishDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { dishes, dishImages } = useStore()
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null)

  const dish = dishes.find((d) => String(d.id) === String(params.id))
  const imageUrl = dish ? dishImages[dish.id] || dish.imageUrl : undefined

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

  return (
    <div className="min-h-screen pb-10">
      {/* Hero Image */}
      <div className="relative h-64 w-full bg-pe-elevated">
        {imageUrl ? (
          <img src={imageUrl} alt={dish.nameEnglish} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">🍽️</div>
        )}
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Floating ingredient badges — positioned around image edges */}
        {dish.ingredients.length > 0 && (
          <>
            {dish.ingredients.slice(0, 5).map((ing, i) => {
              const positions = [
                'top-3 left-3',      // top-left
                'top-3 right-14',    // top-right
                'bottom-3 right-3',  // bottom-right
                'bottom-3 left-3',   // bottom-left
                'top-1/2 right-3 -translate-y-1/2', // mid-right
              ]
              return (
                <span
                  key={ing.name}
                  className={`absolute ${positions[i]} flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm ${BADGE_COLORS[ing.category] || 'bg-pe-text-muted'} bg-opacity-90`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />
                  {ing.name}
                </span>
              )
            })}
          </>
        )}
      </div>

      <div className="px-5 pt-5">
        {/* Country label */}
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-pe-accent">
          {dish.country}
        </p>

        {/* Dish name */}
        <h1 className="text-2xl font-bold">{dish.nameEnglish}</h1>
        <p className="mb-4 text-sm text-pe-text-muted">{dish.nameLocal}</p>

        {/* Status tags */}
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="flex items-center gap-1 rounded-full bg-pe-tag-dietary-bg px-3 py-1 text-xs font-medium text-pe-tag-dietary">
            {dish.dietaryType === 'veg' ? '🟢' : '🔴'} {dish.dietaryType === 'jain-safe' ? 'Jain Safe' : dish.dietaryType === 'veg' ? 'Veg' : 'Non-Veg'}
          </span>
          {dish.allergens.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-pe-tag-allergen-bg px-3 py-1 text-xs font-medium text-pe-tag-allergen">
              ⚠️ {dish.allergens.join(', ')}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-pe-tag-macro-bg px-3 py-1 text-xs font-medium text-pe-tag-macro">
            ⚡ {dish.nutrition.protein > dish.nutrition.carbs ? 'Protein' : 'Carbs'}
          </span>
        </div>

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
    </div>
  )
}
