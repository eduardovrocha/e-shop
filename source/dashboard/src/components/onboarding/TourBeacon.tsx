import { useEffect, useState } from 'react'

export interface TourBeaconProps {
  targetSelector: string
}

const BEACON_SIZE = 36

/**
 * Floating pulsing marker that visually anchors the current tour step to
 * its target element. Mirrors the visual of Joyride's own beacon (two
 * concentric circles, indigo, pulsing) without affecting the target's
 * layout or styling — purely a fixed-position overlay on top-right corner.
 *
 * Tracks the target via getBoundingClientRect + ResizeObserver + window
 * scroll/resize listeners (capture phase, so ancestor scrolls also flush).
 */
export function TourBeacon({ targetSelector }: TourBeaconProps) {
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) {
        setRect(null)
        return
      }
      setRect({
        top:  r.top  - BEACON_SIZE / 2,
        left: r.left + r.width - BEACON_SIZE / 2,
      })
    }

    update()

    const target = document.querySelector(targetSelector) as HTMLElement | null
    const ro = target ? new ResizeObserver(update) : null
    if (ro && target) ro.observe(target)

    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [targetSelector])

  if (!rect) return null

  return (
    <div
      className="tour-beacon"
      data-testid="tour-beacon"
      role="presentation"
      style={{ top: rect.top, left: rect.left }}
    >
      <span className="tour-beacon__outer" />
      <span className="tour-beacon__inner" />
    </div>
  )
}
