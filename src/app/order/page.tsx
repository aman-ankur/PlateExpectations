'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { buildShowText, getLangCode } from '@/lib/orderTemplates'
import { convertPrice, convertTotal } from '@/lib/currency'

function parsePrice(price: string): number | null {
  if (!price) return null
  const cleaned = price.replace(/[^\d.,]/g, '')
  if (!cleaned) return null
  // Handle comma as thousands separator (e.g. 15,000) vs decimal (e.g. 12,50)
  const parts = cleaned.split(',')
  if (parts.length === 2 && parts[1].length === 3) {
    // Comma is thousands separator: 15,000
    return parseFloat(cleaned.replace(/,/g, ''))
  }
  return parseFloat(cleaned.replace(/,/g, '.'))
}

export default function OrderPage() {
  const router = useRouter()
  const { dishes, dishImages, order, updateQuantity, removeFromOrder, clearOrder, preferences } = useStore()
  const exchangeRates = useStore((s) => s.exchangeRates)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const showCardRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const orderDishes = dishes.filter((d) => order[d.id] && order[d.id] > 0)
  const country = orderDishes[0]?.country || ''

  // Allergen warnings
  const userAllergies = preferences.allergies || []
  const allergenWarnings = orderDishes.filter(
    (d) => d.allergens.some((a) => userAllergies.some((ua) => a.toLowerCase().includes(ua.toLowerCase())))
  )

  // Total price
  const total = orderDishes.reduce((sum, d) => {
    const p = parsePrice(d.price)
    if (p === null) return sum
    return sum + p * (order[d.id] || 0)
  }, 0)
  const hasPrices = orderDishes.some((d) => parsePrice(d.price) !== null)
  // Get currency symbol from first priced dish
  const currencySymbol = orderDishes.find((d) => d.price)?.price.replace(/[\d.,\s]/g, '').trim() || ''

  // Show-to-staff text
  const showText = buildShowText(
    orderDishes.map((d) => ({
      nameLocal: d.nameLocalCorrected || d.nameLocal,
      quantity: order[d.id] || 1,
    })),
    country,
  )

  const generateAiVoice = useCallback(async () => {
    setAudioLoading(true)
    setAudioError(null)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishes: orderDishes.map((d) => ({
            name: d.nameLocalCorrected || d.nameLocal || d.nameEnglish,
            quantity: order[d.id] || 1,
          })),
          country,
        }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
    } catch {
      setAudioError('Could not generate voice. Try device voice below.')
    } finally {
      setAudioLoading(false)
    }
  }, [orderDishes, order, country])

  const playAudio = useCallback(() => {
    if (!audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [audioUrl, isPlaying])

  const useDeviceVoice = useCallback(() => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(showText)
    const langCode = getLangCode(country)
    utterance.lang = langCode
    // Try to find a voice for the language
    const voices = window.speechSynthesis.getVoices()
    const match = voices.find((v) => v.lang.startsWith(langCode))
    if (match) utterance.voice = match
    window.speechSynthesis.speak(utterance)
  }, [showText, country])

  const scrollToShowCard = () => {
    showCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  if (!mounted) return null

  if (orderDishes.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <span className="mb-4 text-6xl">📋</span>
        <h1 className="mb-2 text-xl font-bold">No Items Yet</h1>
        <p className="mb-6 text-sm text-pe-text-secondary">Long-press dishes from the menu to add them to your order.</p>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-pe-accent px-6 py-2 text-sm font-semibold text-white"
        >
          Back to Menu
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-36">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pe-surface"
        >
          <svg className="h-5 w-5 text-pe-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Your Order</h1>
          <p className="text-sm text-pe-text-muted">{orderDishes.length} {orderDishes.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      {/* Allergen warnings */}
      {allergenWarnings.length > 0 && (
        <div className="mb-4 rounded-xl border border-pe-tag-allergen/30 bg-pe-tag-allergen-bg p-3">
          <p className="text-xs font-semibold text-pe-tag-allergen">Allergen Warning</p>
          {allergenWarnings.map((d) => (
            <p key={d.id} className="mt-1 text-xs text-pe-tag-allergen/80">
              {d.nameEnglish}: contains {d.allergens.filter((a) =>
                userAllergies.some((ua) => a.toLowerCase().includes(ua.toLowerCase()))
              ).join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* Order items */}
      <div className="space-y-3">
        {orderDishes.map((dish) => {
          const qty = order[dish.id] || 1
          const imageUrl = dishImages[dish.id]?.[0]
          const price = parsePrice(dish.price)
          return (
            <div key={dish.id} className="flex items-center gap-3 rounded-2xl bg-pe-elevated/60 p-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-pe-elevated">
                {imageUrl ? (
                  <img src={imageUrl} alt={dish.nameEnglish} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-pe-text truncate">{dish.nameEnglish}</p>
                <p className="text-xs text-pe-text-muted truncate">{dish.nameLocalCorrected || dish.nameLocal}</p>
                {price !== null && (
                  <p className="text-xs font-medium text-pe-accent">
                    {dish.price} x {qty}
                    {(() => {
                      const converted = convertPrice(dish.price, dish.country, preferences.homeCurrency, exchangeRates)
                      return converted ? <span className="text-pe-text-muted font-normal"> ({converted} ea)</span> : null
                    })()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => qty <= 1 ? removeFromOrder(dish.id) : updateQuantity(dish.id, qty - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-pe-surface text-pe-text"
                >
                  {qty <= 1 ? (
                    <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">−</span>
                  )}
                </button>
                <span className="w-6 text-center text-sm font-bold text-pe-text">{qty}</span>
                <button
                  onClick={() => updateQuantity(dish.id, qty + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-pe-surface text-pe-text"
                >
                  <span className="text-sm font-bold">+</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show to Staff card */}
      <div ref={showCardRef} className="mt-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-pe-text-muted">Show to Staff</p>
        <div className="relative overflow-hidden rounded-2xl bg-pe-surface p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pe-accent via-pe-accent/60 to-transparent" />
          <p className="whitespace-pre-line text-2xl leading-relaxed text-pe-text">{showText}</p>
          <p className="mt-3 text-[10px] text-pe-text-muted">Show your phone to the server</p>
        </div>
      </div>

      {/* Voice buttons — compact side-by-side */}
      <div className="mt-6 flex gap-3">
        {!audioUrl && !audioLoading ? (
          <button
            onClick={generateAiVoice}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pe-accent py-3 text-sm font-semibold text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            AI Voice
          </button>
        ) : audioLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pe-accent/50 py-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span className="text-sm text-white/80">Generating...</span>
          </div>
        ) : (
          <button
            onClick={playAudio}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pe-accent py-3 text-sm font-semibold text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isPlaying ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 9v6m4-6v6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              )}
            </svg>
            {isPlaying ? 'Stop' : 'Play Order'}
          </button>
        )}
        <button
          onClick={useDeviceVoice}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-pe-border py-3 text-sm font-medium text-pe-text-secondary"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          Device
        </button>
      </div>

      {audioError && (
        <p className="mt-2 text-center text-xs text-red-400">{audioError}</p>
      )}

      {/* Disclaimer */}
      <p className="mt-8 text-center text-[10px] text-pe-text-muted">
        AI-estimated. Verify with restaurant staff.
      </p>

      {/* Clear order — low prominence */}
      <button
        onClick={() => { clearOrder(); router.back() }}
        className="mt-4 w-full text-center text-xs text-pe-text-muted underline underline-offset-2"
      >
        Clear entire order
      </button>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-pe-border/50 bg-[#0f0f0f]/95 px-4 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {hasPrices && total > 0 && (
            <div className="flex-1">
              <p className="text-[10px] text-pe-text-muted">Estimated Total</p>
              <p className="text-lg font-bold text-pe-text">{currencySymbol}{total.toLocaleString()}</p>
              {(() => {
                const converted = convertTotal(total, country, preferences.homeCurrency, exchangeRates)
                return converted ? <p className="text-xs text-pe-text-muted">{converted}</p> : null
              })()}
            </div>
          )}
          <button
            onClick={scrollToShowCard}
            className={`rounded-2xl bg-pe-accent px-6 py-3 text-sm font-semibold text-white ${hasPrices && total > 0 ? '' : 'flex-1'}`}
          >
            Show to Staff
          </button>
        </div>
      </div>
    </div>
  )
}
