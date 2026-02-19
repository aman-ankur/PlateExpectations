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

export default function SettingsPage() {
  const router = useRouter()
  const { preferences, setPreferences } = useStore()
  const demoMode = useStore((s) => s.demoMode)
  const toggleDemoMode = useStore((s) => s.toggleDemoMode)

  const [proteins, setProteins] = useState<string[]>(preferences.proteins)
  const [spice, setSpice] = useState(preferences.spice || 'Medium')
  const [diet, setDiet] = useState(preferences.diet)
  const [restrictions, setRestrictions] = useState<string[]>(preferences.restrictions)
  const [allergies, setAllergies] = useState<string[]>(preferences.allergies)
  const [homeCurrency, setHomeCurrency] = useState(preferences.homeCurrency || '')

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item]

  const handleSave = () => {
    setPreferences({ proteins, spice, diet, restrictions, allergies, homeCurrency: homeCurrency || undefined })
    router.back()
  }

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pe-surface"
        >
          <svg className="h-5 w-5 text-pe-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Home Currency */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Home Currency
        </h2>
        <p className="mb-2 text-xs text-pe-text-muted">For approximate price conversion</p>
        <div className="flex flex-wrap gap-2">
          {CURRENCY_OPTIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setHomeCurrency(homeCurrency === c.id ? '' : c.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                homeCurrency === c.id
                  ? 'bg-pe-accent text-white'
                  : 'bg-pe-surface text-pe-text-secondary border border-pe-border'
              }`}
            >
              {c.symbol} {c.id}
            </button>
          ))}
        </div>
      </section>

      {/* Diet Type */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
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
                  : 'bg-pe-surface text-pe-text-secondary border border-pe-border'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      {/* Proteins */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
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
                  : 'bg-pe-surface text-pe-text-secondary border border-pe-border'
              }`}
            >
              <span className="text-xl">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* Spice */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
          Spice Tolerance
        </h2>
        <SpiceMeter value={spice} onChange={setSpice} />
      </section>

      {/* Restrictions */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
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
                  : 'bg-pe-surface text-pe-text-secondary border border-pe-border'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Allergies */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pe-text-secondary">
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
                  : 'bg-pe-surface text-pe-text-secondary border border-pe-border'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={handleSave}
        className="w-full rounded-full bg-pe-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-pe-accent-hover"
      >
        Save Preferences
      </button>

      {/* Demo mode toggle */}
      <section className="mt-10 border-t border-pe-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-pe-text-secondary">Demo Mode</p>
            <p className="text-xs text-pe-text-muted">Use fixture data, no API calls</p>
          </div>
          <button
            onClick={toggleDemoMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              demoMode ? 'bg-pe-accent' : 'bg-pe-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                demoMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  )
}
