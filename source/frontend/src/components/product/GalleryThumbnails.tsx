import { useEffect, useRef } from 'react'

interface GalleryThumbnailsProps {
  images: string[]
  currentIndex: number
  productName: string
  onSelect: (index: number) => void
}

// Horizontal strip of thumbnails. The active one gets ring + scale; when
// the index changes from outside (arrow keys, swipe), we scrollIntoView
// so the active thumbnail stays visible.
export function GalleryThumbnails({
  images, currentIndex, productName, onSelect,
}: GalleryThumbnailsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const el = refs.current[currentIndex]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIndex])

  if (images.length <= 1) return null

  return (
    <div
      role="tablist"
      aria-label="Selecionar imagem"
      className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: 'none' }}
    >
      {images.map((src, i) => {
        const isActive = i === currentIndex
        return (
          <button
            key={`${src}-${i}`}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'true' : undefined}
            aria-label={`Ver imagem ${i + 1} de ${images.length}`}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => {
              // Enter/Space activates by default on buttons; this just makes
              // explicit that we handle it (a11y).
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(i)
              }
            }}
            className={[
              'shrink-0 snap-start overflow-hidden rounded-xl',
              'h-20 w-20 sm:h-24 sm:w-24',
              'transition-all duration-150',
              isActive
                ? 'opacity-100 ring-2 ring-andrequice-gold ring-offset-2 ring-offset-white scale-[1.02]'
                : 'opacity-70 ring-1 ring-transparent hover:opacity-100 hover:ring-andrequice-border focus-visible:opacity-100 focus-visible:ring-andrequice-gold',
              'focus-visible:outline-none',
            ].join(' ')}
          >
            <img
              src={src}
              alt={`${productName} — miniatura ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          </button>
        )
      })}
    </div>
  )
}
