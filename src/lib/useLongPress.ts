import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  onClick?: () => void
  threshold?: number
}

export function useLongPress({ onLongPress, onClick, threshold = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)
  const isTouch = useRef(false)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback((x: number, y: number) => {
    didLongPress.current = false
    startPos.current = { x, y }
    timerRef.current = setTimeout(() => {
      didLongPress.current = true
      if (navigator.vibrate) navigator.vibrate(30)
      onLongPress()
    }, threshold)
  }, [onLongPress, threshold])

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isTouch.current = true
    const touch = e.touches[0]
    start(touch.clientX, touch.clientY)
  }, [start])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - startPos.current.x)
    const dy = Math.abs(touch.clientY - startPos.current.y)
    if (dx > 10 || dy > 10) {
      clear()
      startPos.current = null
    }
  }, [clear])

  const onTouchEnd = useCallback(() => {
    clear()
    if (!didLongPress.current && onClick) {
      onClick()
    }
    startPos.current = null
  }, [clear, onClick])

  // Mouse handlers (desktop fallback — skipped if touch device)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isTouch.current) return // touch already handled
    start(e.clientX, e.clientY)
  }, [start])

  const onMouseUp = useCallback(() => {
    if (isTouch.current) return
    clear()
    startPos.current = null
  }, [clear])

  const onMouseLeave = useCallback(() => {
    if (isTouch.current) return
    clear()
    startPos.current = null
  }, [clear])

  // Single click handler — works for both mouse and suppresses after long-press
  const handleClick = useCallback(() => {
    if (isTouch.current) return // touchEnd already handled navigation
    if (didLongPress.current) return
    if (onClick) onClick()
  }, [onClick])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onClick: handleClick,
  }
}
