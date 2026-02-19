import { COUNTRY_CURRENCY, APPROX_RATES_TO_USD, CURRENCY_OPTIONS } from './constants'

function parseNumericPrice(priceStr: string): number | null {
  if (!priceStr) return null
  const cleaned = priceStr.replace(/[^\d.,]/g, '')
  if (!cleaned) return null
  const parts = cleaned.split(',')
  if (parts.length === 2 && parts[1].length === 3) {
    return parseFloat(cleaned.replace(/,/g, ''))
  }
  return parseFloat(cleaned.replace(/,/g, '.'))
}

function formatConverted(value: number, symbol: string): string {
  if (value >= 100) {
    return `~${symbol}${Math.round(value).toLocaleString()}`
  }
  return `~${symbol}${value.toFixed(2)}`
}

function getSymbol(currencyId: string): string {
  return CURRENCY_OPTIONS.find((c) => c.id === currencyId)?.symbol || currencyId
}

export function convertPrice(
  priceStr: string,
  country: string,
  homeCurrency: string | undefined,
  rates?: Record<string, number>,
): string | null {
  if (!homeCurrency) return null
  const sourceCurrency = COUNTRY_CURRENCY[country]
  if (!sourceCurrency || sourceCurrency === homeCurrency) return null
  const rateMap = rates && Object.keys(rates).length > 0 ? rates : APPROX_RATES_TO_USD
  const sourceRate = rateMap[sourceCurrency]
  const targetRate = rateMap[homeCurrency]
  if (!sourceRate || !targetRate) return null
  const value = parseNumericPrice(priceStr)
  if (value === null || value <= 0) return null
  const inUsd = value / sourceRate
  const converted = inUsd * targetRate
  return formatConverted(converted, getSymbol(homeCurrency))
}

export function convertTotal(
  total: number,
  country: string,
  homeCurrency: string | undefined,
  rates?: Record<string, number>,
): string | null {
  if (!homeCurrency || total <= 0) return null
  const sourceCurrency = COUNTRY_CURRENCY[country]
  if (!sourceCurrency || sourceCurrency === homeCurrency) return null
  const rateMap = rates && Object.keys(rates).length > 0 ? rates : APPROX_RATES_TO_USD
  const sourceRate = rateMap[sourceCurrency]
  const targetRate = rateMap[homeCurrency]
  if (!sourceRate || !targetRate) return null
  const inUsd = total / sourceRate
  const converted = inUsd * targetRate
  return formatConverted(converted, getSymbol(homeCurrency))
}
