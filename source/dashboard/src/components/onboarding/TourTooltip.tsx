import { useEffect, useId, useRef } from 'react'
import { TourProgressIndicator } from './TourProgressIndicator'

export type TourTooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TourTooltipProps {
  title: string
  body: string
  stepIndex: number
  totalSteps: number
  phase: 1 | 2
  position?: TourTooltipPosition
  isFirstStep?: boolean
  isLastStep?: boolean
  onPrev?: () => void
  onNext?: () => void
  onSkip?: () => void
  /**
   * Locks the auto-focus behavior. The playground turns it off for the
   * static showcase; the live tour leaves it on so the keyboard user lands
   * inside the tooltip.
   */
  autoFocus?: boolean
}

export function TourTooltip({
  title,
  body,
  stepIndex,
  totalSteps,
  phase,
  position = 'bottom',
  isFirstStep = false,
  isLastStep = false,
  onPrev,
  onNext,
  onSkip,
  autoFocus = true,
}: TourTooltipProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const nextButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  const bodyId  = useId()

  useEffect(() => {
    if (!autoFocus) return
    nextButtonRef.current?.focus()
  }, [autoFocus, stepIndex])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onSkip) {
        e.stopPropagation()
        onSkip()
      }
    }
    const node = containerRef.current
    node?.addEventListener('keydown', handleKey)
    return () => node?.removeEventListener('keydown', handleKey)
  }, [onSkip])

  const nextLabel = isLastStep ? 'Concluir' : 'Próximo →'

  return (
    <div
      ref={containerRef}
      className="tour-tooltip"
      data-position={position}
      data-testid="tour-tooltip"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
    >
      <h2 id={titleId} className="tour-tooltip__title">
        {title}
      </h2>
      <p id={bodyId} className="tour-tooltip__body">
        {body}
      </p>

      <TourProgressIndicator
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        phase={phase}
      />

      <div className="tour-tooltip__controls">
        <button
          type="button"
          className="tour-link-skip"
          onClick={onSkip}
          data-testid="tour-skip"
        >
          Pular tour
        </button>

        <div className="tour-tooltip__controls-right">
          {!isFirstStep && (
            <button
              type="button"
              className="tour-button-secondary"
              onClick={onPrev}
              disabled={isFirstStep}
              data-testid="tour-prev"
            >
              ← Voltar
            </button>
          )}
          <button
            type="button"
            ref={nextButtonRef}
            className="tour-button-primary"
            onClick={onNext}
            data-testid="tour-next"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
