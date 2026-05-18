export interface TourProgressIndicatorProps {
  stepIndex: number
  totalSteps: number
  phase: 1 | 2
}

export function TourProgressIndicator({
  stepIndex,
  totalSteps,
  phase,
}: TourProgressIndicatorProps) {
  const safeTotal = Math.max(1, totalSteps)
  const clampedIndex = Math.min(Math.max(0, stepIndex), safeTotal - 1)
  const currentStep = clampedIndex + 1

  return (
    <div data-testid="tour-progress-indicator">
      <div
        className="tour-tooltip__indicator"
        aria-label={`Passo ${currentStep} de ${safeTotal}, Fase ${phase}`}
      >
        Passo {currentStep} de {safeTotal} · Fase {phase}
      </div>
      <div
        className="tour-tooltip__progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={safeTotal}
        aria-valuenow={currentStep}
      >
        {Array.from({ length: safeTotal }).map((_, i) => (
          <span
            key={i}
            data-testid="tour-progress-dot"
            data-filled={i <= clampedIndex ? 'true' : 'false'}
            className={
              i <= clampedIndex
                ? 'tour-tooltip__progress-dot tour-tooltip__progress-dot--filled'
                : 'tour-tooltip__progress-dot'
            }
          />
        ))}
      </div>
    </div>
  )
}
