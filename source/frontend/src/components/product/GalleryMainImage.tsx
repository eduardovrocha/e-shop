import { forwardRef, useCallback, useRef, useState, type PointerEvent } from 'react'

interface GalleryMainImageProps {
  images: string[]
  currentIndex: number
  productName: string
  // Notify parent of navigation requests. The component does not own
  // state — parent (ProductGallery) keeps `currentIndex` so thumbnails
  // and main stay in sync.
  onChange: (nextIndex: number) => void
  onZoomRequest: () => void
}

const SWIPE_THRESHOLD = 50

// Image-shaped fallback SVG, shown when the network fetch fails so we
// don't crash the layout. Pure SVG to avoid extra requests.
const FALLBACK_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#A8947D" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
  )

export const GalleryMainImage = forwardRef<HTMLDivElement, GalleryMainImageProps>(function GalleryMainImage(
  { images, currentIndex, productName, onChange, onZoomRequest },
  ref
) {
  const total = images.length
  const isFirst = currentIndex <= 0
  const isLast  = currentIndex >= total - 1
  const showNav = total > 1

  // ── Swipe (pointer events, native — no lib) ───────────────────────────
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const moveLockedRef = useRef<'horizontal' | 'vertical' | null>(null)

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return // mouse drag handled by click, no swipe
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    moveLockedRef.current = null
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (startXRef.current == null || startYRef.current == null) return
    const dx = Math.abs(e.clientX - startXRef.current)
    const dy = Math.abs(e.clientY - startYRef.current)
    if (moveLockedRef.current == null && (dx > 8 || dy > 8)) {
      moveLockedRef.current = dx > dy ? 'horizontal' : 'vertical'
    }
  }, [])

  const handlePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (startXRef.current == null) return
    const dx = e.clientX - startXRef.current
    const reset = () => {
      startXRef.current = null
      startYRef.current = null
      moveLockedRef.current = null
    }
    if (moveLockedRef.current === 'horizontal' && Math.abs(dx) >= SWIPE_THRESHOLD) {
      if (dx < 0 && !isLast)  onChange(currentIndex + 1)
      if (dx > 0 && !isFirst) onChange(currentIndex - 1)
    }
    reset()
  }, [currentIndex, isFirst, isLast, onChange])

  // ── Image error fallback ──────────────────────────────────────────────
  const [errored, setErrored] = useState<Record<number, boolean>>({})
  const handleError = useCallback((idx: number) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[ProductGallery] image ${idx + 1} failed to load`)
    }
    setErrored((prev) => ({ ...prev, [idx]: true }))
  }, [])

  return (
    <div
      ref={ref}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Galeria de imagens — ${productName}`}
      tabIndex={0}
      className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-andrequice-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold focus-visible:ring-offset-2"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* The active image. key on idx triggers a remount + fade-in via CSS. */}
      <img
        key={currentIndex}
        src={errored[currentIndex] ? FALLBACK_DATA_URL : images[currentIndex]}
        alt={`${productName} — foto ${currentIndex + 1} de ${total}`}
        loading={currentIndex === 0 ? 'eager' : 'lazy'}
        onError={() => handleError(currentIndex)}
        onClick={onZoomRequest}
        className="absolute inset-0 h-full w-full cursor-zoom-in object-cover transition-opacity duration-200 ease-out"
      />

      {/* Preload neighbours off-screen so swipe/arrow doesn't blink. */}
      {showNav && !isFirst && (
        <img src={images[currentIndex - 1]} alt="" aria-hidden="true" className="hidden" />
      )}
      {showNav && !isLast && (
        <img src={images[currentIndex + 1]} alt="" aria-hidden="true" className="hidden" />
      )}

      {showNav && (
        <>
          <button
            type="button"
            onClick={() => !isFirst && onChange(currentIndex - 1)}
            disabled={isFirst}
            aria-label="Imagem anterior"
            className={[
              'absolute left-4 top-1/2 -translate-y-1/2',
              'flex h-10 w-10 items-center justify-center rounded-full',
              'bg-white/92 text-andrequice-navy shadow-soft backdrop-blur-sm',
              'transition-opacity duration-200',
              // visible by default on touch/mobile; appears on hover on desktop
              'opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
              'disabled:cursor-not-allowed disabled:opacity-40 lg:disabled:group-hover:opacity-40',
            ].join(' ')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => !isLast && onChange(currentIndex + 1)}
            disabled={isLast}
            aria-label="Próxima imagem"
            className={[
              'absolute right-4 top-1/2 -translate-y-1/2',
              'flex h-10 w-10 items-center justify-center rounded-full',
              'bg-white/92 text-andrequice-navy shadow-soft backdrop-blur-sm',
              'transition-opacity duration-200',
              'opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
              'disabled:cursor-not-allowed disabled:opacity-40 lg:disabled:group-hover:opacity-40',
            ].join(' ')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
})
