import { NextRequest, NextResponse } from 'next/server'
import { getEnrichmentProvider, buildPrefsDescription } from '@/lib/providers'
import { DEFAULT_PREFERENCES, Preferences } from '@/lib/types'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    // Demo mode: return mock detail data
    if (process.env.DEMO_MODE === 'true' || req.cookies.get('pe-demo')?.value === 'true') {
      const body = await req.json()
      const dishes = body.dishes || []
      // Return empty detail — demo fixtures already have full data
      return NextResponse.json({
        dishes: dishes.map((d: { id: string }) => ({
          id: d.id,
          ingredients: [],
          nutrition: { protein: 0, carbs: 0, fat: 0, fiber: 0, kcal: 0 },
          explanation: '',
          culturalTerms: [],
        })),
      })
    }

    const body = await req.json()
    const { dishes, preferences }: {
      dishes: Array<{ id: string; nameEnglish: string; nameLocal: string; brief: string; country: string }>
      preferences?: Preferences
    } = body

    if (!dishes || dishes.length === 0) {
      return NextResponse.json({ error: 'No dishes provided' }, { status: 400 })
    }

    const prefs = preferences || DEFAULT_PREFERENCES
    const prefsDescription = buildPrefsDescription(prefs)
    const enrichment = getEnrichmentProvider()

    console.log(`[enrich-detail] Enriching ${dishes.length} dishes with ${enrichment.name}`)
    const details = await enrichment.enrichBatchDetail(dishes, prefsDescription)

    return NextResponse.json({ dishes: details })
  } catch (err) {
    console.error('[enrich-detail] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
