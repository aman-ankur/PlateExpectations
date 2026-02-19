'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function ExchangeRateLoader() {
  const fetchExchangeRates = useStore((s) => s.fetchExchangeRates)

  useEffect(() => {
    fetchExchangeRates()
  }, [fetchExchangeRates])

  return null
}
