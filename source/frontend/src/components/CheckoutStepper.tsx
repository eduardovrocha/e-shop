// Decorative checkout stepper. The /checkout page is single-page (not
// multi-step), so this component is purely visual — driven by whatever
// state the parent maps to currentStep (typically: 1 = filling form,
// 2 = paying via Stripe, 3 = post-checkout review, not used here).

interface CheckoutStepperProps {
  currentStep: 1 | 2 | 3
  steps?: string[]
}

const DEFAULT_STEPS = ['Envio', 'Pagamento', 'Revisão']

export function CheckoutStepper({ currentStep, steps = DEFAULT_STEPS }: CheckoutStepperProps) {
  return (
    <ol className="flex items-center w-full" aria-label="Etapas do checkout">
      {steps.map((label, idx) => {
        const stepNumber = idx + 1
        const isActive = stepNumber === currentStep
        const isDone   = stepNumber <  currentStep
        const isLast   = idx === steps.length - 1

        return (
          <li key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0',
                  isActive
                    ? 'bg-andrequice-gold text-andrequice-navy'
                    : isDone
                      ? 'bg-andrequice-navy text-andrequice-cream'
                      : 'bg-white border border-andrequice-sand text-andrequice-border',
                ].join(' ')}
              >
                {isDone ? '✓' : stepNumber}
              </span>
              <span
                className={[
                  'text-sm font-medium truncate',
                  isActive
                    ? 'text-andrequice-navy'
                    : isDone
                      ? 'text-andrequice-brown'
                      : 'text-andrequice-border',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                aria-hidden="true"
                className={[
                  'flex-1 h-px mx-3',
                  isDone ? 'bg-andrequice-navy' : 'bg-andrequice-sand',
                ].join(' ')}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
