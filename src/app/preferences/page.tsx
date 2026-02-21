'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  PROTEIN_OPTIONS,
  DIET_OPTIONS,
  RESTRICTION_OPTIONS,
  ALLERGY_OPTIONS,
  CURRENCY_OPTIONS,
} from '@/lib/constants'
import SpiceMeter from '@/components/SpiceMeter'

export default function PreferencesPage() {
  const router = useRouter()
  const { preferences, setPreferences } = useStore()

  const [proteins, setProteins] = useState<string[]>(preferences.proteins)
  const [spice, setSpice] = useState(preferences.spice || 'Medium')
  const [diet, setDiet] = useState(preferences.diet)
  const [restrictions, setRestrictions] = useState<string[]>(preferences.restrictions)
  const [allergies, setAllergies] = useState<string[]>(preferences.allergies)
  const [homeCurrency, setHomeCurrency] = useState(preferences.homeCurrency || '')

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item]

  const handleContinue = () => {
    setPreferences({
      proteins,
      spice,
      diet,
      restrictions,
      allergies,
      homeCurrency: homeCurrency || undefined,
      hasCompletedOnboarding: true,
    })
    router.push('/results')
  }

  const handleSkip = () => {
    setPreferences({ hasCompletedOnboarding: true })
    router.push('/results')
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">Your Preferences</h1>
      <p className="mb-8 text-sm text-pe-text-secondary">
        Help us recommend dishes you&apos;ll love
      </p>

      {/* Home Currency */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Home Currency
        </h2>
        <p className="mb-3 text-xs text-pe-text-muted">For approximate price conversion</p>
        <div className="flex flex-wrap gap-2">
          {CURRENCY_OPTIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setHomeCurrency(homeCurrency === c.id ? '' : c.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                homeCurrency === c.id
                  ? 'bg-pe-accent text-white'
                  : 'bg-pe-surface text-pe-text-secondary shadow-pe-card'
              }`}
            >
              {c.symbol} {c.id}
            </button>
          ))}
        </div>
      </section>

      {/* Diet Type */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Dietary Preference
        </h2>
        <div className="flex gap-2">
          {DIET_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDiet(d)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                diet === d
                  ? 'bg-pe-accent text-white'
                  : 'bg-pe-surface text-pe-text-secondary shadow-pe-card'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      {/* Proteins */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Proteins I enjoy
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {PROTEIN_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProteins(toggleItem(proteins, p.id))}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                proteins.includes(p.id)
                  ? 'bg-pe-accent text-white'
                  : 'bg-pe-surface text-pe-text-secondary shadow-pe-card'
              }`}
            >
              <span className="text-xl">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* Spice */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Spice Tolerance
        </h2>
        <SpiceMeter value={spice} onChange={setSpice} />
      </section>

      {/* Restrictions */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Restrictions
        </h2>
        <div className="flex flex-wrap gap-2">
          {RESTRICTION_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRestrictions(toggleItem(restrictions, r))}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                restrictions.includes(r)
                  ? 'bg-pe-tag-dietary-bg text-pe-tag-dietary'
                  : 'bg-pe-surface text-pe-text-secondary shadow-pe-card'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Allergies */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Allergies
        </h2>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((a) => (
            <button
              key={a}
              onClick={() => setAllergies(toggleItem(allergies, a))}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                allergies.includes(a)
                  ? 'bg-pe-tag-allergen-bg text-pe-tag-allergen'
                  : 'bg-pe-surface text-pe-text-secondary shadow-pe-card'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={handleContinue}
        className="mb-3 w-full rounded-full bg-pe-text px-6 py-3.5 font-semibold text-pe-bg transition-colors hover:opacity-90"
      >
        Continue
      </button>
      <button
        onClick={handleSkip}
        className="w-full py-2 text-sm text-pe-text-muted transition-colors hover:text-pe-text-secondary"
      >
        Skip for now
      </button>
    </div>
  )
}
