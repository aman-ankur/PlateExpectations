'use client'

import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function OrderFab() {
  const router = useRouter()
  const order = useStore((s) => s.order)
  const clearOrder = useStore((s) => s.clearOrder)

  const totalItems = Object.values(order).reduce((sum, qty) => sum + qty, 0)

  if (totalItems === 0) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center animate-slide-up">
      <div className="flex items-center gap-1 rounded-full border border-pe-border bg-pe-surface/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <button
          onClick={() => router.push('/order')}
          className="flex items-center gap-2 text-sm font-semibold text-pe-text"
        >
          <span>🛒</span>
          <span>View Order · {totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
        </button>
        <span className="mx-1 h-4 w-px bg-pe-border" />
        <button
          onClick={(e) => {
            e.stopPropagation()
            clearOrder()
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full text-pe-text-muted hover:bg-pe-elevated hover:text-pe-text transition-colors"
          aria-label="Clear order"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
