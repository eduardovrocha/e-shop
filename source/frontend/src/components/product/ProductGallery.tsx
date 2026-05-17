import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

// Image gallery with thumbnail strip, keyboard arrows and ARIA carousel
// semantics. Single-image fallback hides controls.
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const mainRef = useRef<HTMLDivElement | null>(null)

  // Clamp active when image list changes (e.g. product switches).
  useEffect(() => {
    if (active > images.length - 1) setActive(0)
  }, [images.length, active])

  const goTo = useCallback((idx: number) => {
    setActive(((idx % images.length) + images.length) % images.length)
  }, [images.length])

  const prev = useCallback(() => goTo(active - 1), [active, goTo])
  const next = useCallback(() => goTo(active + 1), [active, goTo])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft')  { prev(); e.preventDefault() }
    if (e.key === 'ArrowRight') { next(); e.preventDefault() }
  }, [prev, next])

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-2xl bg-andrequice-sand" />
    )
  }

  const multiple = images.length > 1

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={handleKeyDown}
    >
      {/* Main image */}
      <div
        ref={mainRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Galeria de imagens: ${productName}`}
        tabIndex={0}
        className="relative aspect-square w-full rounded-2xl overflow-hidden bg-andrequice-sand focus:outline-none focus:ring-2 focus:ring-andrequice-gold focus:ring-offset-2"
      >
        <img
          key={active}
          src={images[active]}
          alt={`${productName} — imagem ${active + 1} de ${images.length}`}
          className="w-full h-full object-cover"
        />

        {multiple && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Imagem anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-soft hover:bg-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próxima imagem"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-soft hover:bg-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* Counter — small, top-right */}
            <span className="absolute top-3 right-3 rounded-full bg-andrequice-navy/60 text-white text-[11px] font-medium px-2.5 py-1">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {multiple && (
        <div
          role="tablist"
          aria-label="Selecionar imagem"
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x"
        >
          {images.map((src, i) => {
            const isActive = i === active
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Imagem ${i + 1} de ${images.length}`}
                onClick={() => goTo(i)}
                className={[
                  'shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden snap-start transition-all',
                  isActive
                    ? 'ring-2 ring-andrequice-gold ring-offset-2 ring-offset-white'
                    : 'opacity-70 hover:opacity-100',
                ].join(' ')}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
