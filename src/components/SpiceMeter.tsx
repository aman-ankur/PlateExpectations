'use client'

import { useRef, useCallback } from 'react'

const SPICE_LEVELS = [
  { value: 'No Heat', emoji: '🧊' },
  { value: 'Mild', emoji: '🌶️' },
  { value: 'Medium', emoji: '🌶️🌶️' },
  { value: 'Spicy', emoji: '🔥' },
  { value: 'Very Spicy', emoji: '🔥🔥' },
  { value: 'Burn Me', emoji: '💀🔥' },
]

interface SpiceMeterProps {
  value: string
  onChange: (value: string) => void
}

export default function SpiceMeter({ value, onChange }: SpiceMeterProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const currentIndex = Math.max(0, SPICE_LEVELS.findIndex((l) => l.value === value))

  const getIndexFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return currentIndex
    const rect = track.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(fraction * (SPICE_LEVELS.length - 1))
  }, [currentIndex])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const idx = getIndexFromClientX(e.clientX)
    onChange(SPICE_LEVELS[idx].value)
  }, [getIndexFromClientX, onChange])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const idx = getIndexFromClientX(e.clientX)
    onChange(SPICE_LEVELS[idx].value)
  }, [getIndexFromClientX, onChange])

  const thumbPct = (currentIndex / (SPICE_LEVELS.length - 1)) * 100

  return (
    <div className="select-none">
      {/* Track + thumb */}
      <div
        ref={trackRef}
        className="relative mx-3 h-2 cursor-pointer rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-50% via-orange-500 to-red-600"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        style={{ touchAction: 'none' }}
      >
        {/* Snap dots */}
        {SPICE_LEVELS.map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
            style={{ left: `${(i / (SPICE_LEVELS.length - 1)) * 100}%` }}
          />
        ))}
        {/* Thumb */}
        <div
          className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg shadow-black/30 transition-[left] duration-100"
          style={{ left: `${thumbPct}%` }}
        >
          <span className="text-sm leading-none">{SPICE_LEVELS[currentIndex].emoji}</span>
        </div>
      </div>

      {/* Labels below */}
      <div className="mt-3 flex justify-between px-0">
        {SPICE_LEVELS.map((level, i) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={`flex flex-col items-center gap-0.5 text-[10px] transition-colors ${
              i === currentIndex ? 'text-pe-text font-semibold' : 'text-pe-text-muted'
            }`}
          >
            <span className="text-sm">{level.emoji}</span>
            <span className="max-w-[48px] text-center leading-tight">{level.value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
