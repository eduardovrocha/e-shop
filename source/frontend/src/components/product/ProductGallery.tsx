import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { GalleryMainImage } from './GalleryMainImage'
import { GalleryThumbnails } from './GalleryThumbnails'
import { GalleryLightbox } from './GalleryLightbox'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

// Orchestrator: owns currentIndex + lightbox open state. Renders three
// dumb subcomponents and wires keyboard navigation at the container level.
// Sub-components stay isolated and reusable.
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [current, setCurrent]     = useState(0)
  const [lightboxOpen, setLightbox] = useState(false)
  const mainRef = useRef<HTMLDivElement | null>(null)

  // Reset to first image if the list changes (e.g. product switch).
  useEffect(() => {
    if (current > images.length - 1) setCurrent(0)
  }, [images.length, current])

  // Arrow keys at the region level — works while focus is anywhere inside
  // (main image or a thumbnail).
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (images.length <= 1) return
    if (e.key === 'ArrowLeft') {
      if (current > 0) setCurrent(current - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowRight') {
      if (current < images.length - 1) setCurrent(current + 1)
      e.preventDefault()
    }
  }, [current, images.length])

  // ── Empty state ────────────────────────────────────────────────────────
  if (images.length === 0) {
    return (
      <div
        role="region"
        aria-label={`Galeria de imagens — ${productName}`}
        className="aspect-square w-full flex flex-col items-center justify-center gap-2 rounded-2xl bg-andrequice-cream border border-andrequice-sand"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-andrequice-border" aria-hidden="true">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
          <line x1="13.5" y1="13.5" x2="6" y2="21" />
          <line x1="18" y1="12" x2="21" y2="15" />
          <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
          <path d="M21 15V5a2 2 0 0 0-2-2H9" />
        </svg>
        <p className="text-xs text-andrequice-border">Sem imagens disponíveis</p>
      </div>
    )
  }

  return (
    <div onKeyDown={handleKeyDown} className="flex flex-col gap-3">
      <GalleryMainImage
        ref={mainRef}
        images={images}
        currentIndex={current}
        productName={productName}
        onChange={setCurrent}
        onZoomRequest={() => setLightbox(true)}
      />

      <GalleryThumbnails
        images={images}
        currentIndex={current}
        productName={productName}
        onSelect={setCurrent}
      />

      {/* Screen-reader-only live announcement */}
      <div className="sr-only" aria-live="polite">
        Imagem {current + 1} de {images.length}
      </div>

      <GalleryLightbox
        open={lightboxOpen}
        images={images}
        currentIndex={current}
        productName={productName}
        onChange={setCurrent}
        onClose={() => {
          setLightbox(false)
          // restore focus to the main image (region) when closing
          setTimeout(() => mainRef.current?.focus(), 0)
        }}
      />
    </div>
  )
}
