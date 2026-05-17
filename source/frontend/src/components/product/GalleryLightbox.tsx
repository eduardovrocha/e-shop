import { useCallback, useEffect, useId, useRef } from 'react'

interface GalleryLightboxProps {
  open: boolean
  images: string[]
  currentIndex: number
  productName: string
  onChange: (index: number) => void
  onClose: () => void
}

// Self-contained lightbox modal scoped to ProductGallery. Locks body
// scroll while open, traps focus inside, restores it on close, and
// supports keyboard (← → Esc + Tab cycle).
export function GalleryLightbox({
  open, images, currentIndex, productName, onChange, onClose,
}: GalleryLightboxProps) {
  const titleId = useId()
  const closeBtnRef    = useRef<HTMLButtonElement | null>(null)
  const previouslyFocused = useRef<Element | null>(null)
  const total = images.length
  const isFirst = currentIndex <= 0
  const isLast  = currentIndex >= total - 1

  // ── Body scroll lock + focus restore ─────────────────────────────────
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus the close button so Esc works immediately and screen readers
    // announce the modal context.
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)
    return () => {
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus()
      }
    }
  }, [open])

  // ── Keyboard: Esc closes, arrows navigate, Tab cycles within modal ───
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowLeft' && !isFirst) {
      e.preventDefault()
      onChange(currentIndex - 1)
      return
    }
    if (e.key === 'ArrowRight' && !isLast) {
      e.preventDefault()
      onChange(currentIndex + 1)
      return
    }
  }, [open, isFirst, isLast, currentIndex, onChange, onClose])

  useEffect(() => {
    if (!open) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open || total === 0) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        // Click on backdrop (the wrapper itself, not children) closes.
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-sm"
    >
      <h2 id={titleId} className="sr-only">
        Galeria ampliada de {productName}
      </h2>

      {/* Counter */}
      {total > 1 && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 text-sm font-medium text-white/90 tabular-nums">
          {currentIndex + 1} / {total}
        </div>
      )}

      {/* Close button */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="Fechar galeria"
        className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Prev / Next */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!isFirst) onChange(currentIndex - 1) }}
            disabled={isFirst}
            aria-label="Imagem anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!isLast) onChange(currentIndex + 1) }}
            disabled={isLast}
            aria-label="Próxima imagem"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      <img
        key={currentIndex}
        src={images[currentIndex]}
        alt={`${productName} — foto ${currentIndex + 1} de ${total}`}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
