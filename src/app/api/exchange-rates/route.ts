import { NextRequest, NextResponse } from 'next/server'
import { APPROX_RATES_TO_USD } from '@/lib/constants'

export async function GET(req: NextRequest) {
  // Demo mode: return hardcoded rates
  if (process.env.DEMO_MODE === 'true' || req.cookies.get('pe-demo')?.value === 'true') {
    return NextResponse.json({ rates: APPROX_RATES_TO_USD, timestamp: Date.now() })
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 21600 } })
    if (!res.ok) throw new Error('Exchange rate API error')
    const data = await res.json()
    return NextResponse.json({ rates: data.rates, timestamp: Date.now() })
  } catch {
    return NextResponse.json({ rates: APPROX_RATES_TO_USD, timestamp: Date.now() })
  }
}
