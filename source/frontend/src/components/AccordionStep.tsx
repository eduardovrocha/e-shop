import { useEffect, useId, useRef } from 'react'

export type AccordionStepState = 'pending' | 'active' | 'confirmed'

interface AccordionStepProps {
  state: AccordionStepState
  number: number
  title: string
  summary?: React.ReactNode
  children?: React.ReactNode
  onEdit?: () => void
  scrollIntoViewOnActive?: boolean
}

// Dumb component — its parent (CheckoutAccordion) owns the state machine
// and passes a fresh `state` whenever it transitions. The step itself
// renders one of three layouts.
export function AccordionStep({
  state,
  number,
  title,
  summary,
  children,
  onEdit,
  scrollIntoViewOnActive = true,
}: AccordionStepProps) {
  const id = useId()
  const headerRef = useRef<HTMLDivElement | null>(null)

  // When a step becomes active, scroll its header into view so the user
  // sees the freshly-opened block. Only fires on transition, not on every
  // render — the dependency on `state` does the work.
  useEffect(() => {
    if (state === 'active' && scrollIntoViewOnActive && headerRef.current) {
      const t = setTimeout(() => {
        headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return () => clearTimeout(t)
    }
  }, [state, scrollIntoViewOnActive])

  const isActive    = state === 'active'
  const isConfirmed = state === 'confirmed'
  const isPending   = state === 'pending'

  return (
    <section
      ref={headerRef}
      aria-labelledby={`${id}-title`}
      className={[
        'bg-white rounded-2xl shadow-soft overflow-hidden transition-all',
        isPending ? 'opacity-60' : 'opacity-100',
      ].join(' ')}
    >
      <header className="flex items-center gap-3 px-5 py-4">
        <span
          aria-hidden="true"
          className={[
            'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0',
            isActive
              ? 'bg-andrequice-gold text-andrequice-navy'
              : isConfirmed
                ? 'bg-andrequice-navy text-andrequice-cream'
                : 'bg-andrequice-sand text-andrequice-border',
          ].join(' ')}
        >
          {isConfirmed ? '✓' : number}
        </span>

        <h3
          id={`${id}-title`}
          className={[
            'flex-1 font-serif text-lg leading-tight',
            isActive
              ? 'font-semibold text-andrequice-navy'
              : isConfirmed
                ? 'font-medium text-andrequice-navy'
                : 'text-andrequice-border',
          ].join(' ')}
        >
          {title}
        </h3>

        {isConfirmed && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-andrequice-gold hover:text-andrequice-copper transition-colors"
          >
            Editar
          </button>
        )}
      </header>

      {isConfirmed && summary && (
        <div className="px-5 pb-4 -mt-2 text-sm text-andrequice-brown/80">
          {summary}
        </div>
      )}

      {isActive && (
        <div
          aria-expanded="true"
          aria-controls={`${id}-body`}
          className="border-t border-andrequice-sand"
        >
          <div id={`${id}-body`} className="px-5 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </div>
      )}
    </section>
  )
}
