'use client'

import { useStore } from '@/lib/store'

export default function DemoBanner() {
  const demoMode = useStore((s) => s.demoMode)
  const toggleDemoMode = useStore((s) => s.toggleDemoMode)

  if (!demoMode) return null

  return (
    <div className="flex items-center justify-between bg-amber-600/90 px-4 py-1.5 text-xs font-semibold text-white">
      <span>Demo Mode — no API calls, fixture data only</span>
      <button
        onClick={toggleDemoMode}
        className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold hover:bg-white/30"
      >
        Exit
      </button>
    </div>
  )
}
