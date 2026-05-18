import { useEffect, useState } from 'react'

/**
 * Returns true when the viewport is narrower than the tour's minimum
 * supported width. The tour blocks rendering below this breakpoint per
 * the visual spec section 12. We use a media query listener so the guard
 * reacts to live resizes (rotating a tablet, resizing the browser).
 */
const MIN_WIDTH_PX = 768

export function useViewportTooNarrow(): boolean {
  const [tooNarrow, setTooNarrow] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${MIN_WIDTH_PX - 1}px)`).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MIN_WIDTH_PX - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setTooNarrow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return tooNarrow
}
