import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccordionStep, type AccordionStepState } from './AccordionStep'

// A single step definition. The parent (e.g. /cart) describes each block
// with these fields; the accordion takes care of orchestrating who is
// active, who is pending, who is confirmed, and what happens on edit.
export interface AccordionStepDef {
  id: string
  title: string
  // Whether the user can confirm this step right now (used to disable
  // the "Continuar" button and to decide auto-confirm on edit jumps).
  isValid: boolean
  summary: React.ReactNode
  // Content rendered when the step is active. Receives a `onConfirm`
  // callback that the step's own "Continuar" button should call.
  render: (helpers: { onConfirm: () => void; canConfirm: boolean }) => React.ReactNode
}

interface CheckoutAccordionProps {
  steps: AccordionStepDef[]
  // Called whenever the set of confirmed step ids changes. The parent uses
  // this to enable the final CTA when all required steps are confirmed.
  onConfirmedChange?: (confirmedIds: string[]) => void
  onAllConfirmed?: () => void
}

// Controller. Owns:
//   - currentStepId  (the one currently expanded)
//   - confirmed      (Set<stepId> — steps the user has confirmed at
//                     least once; used so we know whether "revert on
//                     edit" should restore confirmed vs pending)
//
// Transitions (matching the spec):
//   - Confirm step N → confirmed.add(N), advance to N+1 if it exists
//   - Edit step X (X already confirmed):
//       1) snapshot current state
//       2) if currentStep is valid → auto-confirm it; otherwise revert
//          to whatever its prior state was (confirmed if previously,
//          pending if never)
//       3) make X active
//
// Confirming a later step never invalidates earlier ones.
export function CheckoutAccordion({
  steps,
  onConfirmedChange,
  onAllConfirmed,
}: CheckoutAccordionProps) {
  const firstId = steps[0]?.id ?? ''
  const [currentStepId, setCurrentStepId] = useState<string>(firstId)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())

  // Notify parent whenever the confirmed set changes. Wrapped in effect
  // to avoid calling during render.
  useEffect(() => {
    onConfirmedChange?.(Array.from(confirmed))
  }, [confirmed, onConfirmedChange])

  const stepIndex = useMemo(
    () => new Map(steps.map((s, i) => [s.id, i])),
    [steps]
  )

  const stateOf = useCallback(
    (id: string): AccordionStepState => {
      if (id === currentStepId) return 'active'
      if (confirmed.has(id))    return 'confirmed'
      return 'pending'
    },
    [currentStepId, confirmed]
  )

  const handleConfirm = useCallback(
    (id: string) => {
      setConfirmed((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      const idx = stepIndex.get(id) ?? -1
      const nextStep = idx >= 0 ? steps[idx + 1] : undefined
      if (nextStep) {
        setCurrentStepId(nextStep.id)
      } else {
        // Last step confirmed.
        setCurrentStepId('')
        onAllConfirmed?.()
      }
    },
    [steps, stepIndex, onAllConfirmed]
  )

  const handleEdit = useCallback(
    (targetId: string) => {
      // Resolve the fate of the currently-active step before jumping.
      const activeStep = steps.find((s) => s.id === currentStepId)
      if (activeStep) {
        if (activeStep.isValid) {
          setConfirmed((prev) => {
            const next = new Set(prev)
            next.add(activeStep.id)
            return next
          })
        }
        // If invalid: don't add to confirmed. Whether it had been
        // confirmed before is irrelevant — its data stays in store/state
        // (we don't clear it here); it just won't be "confirmed" until
        // the user finishes filling it. This matches spec: "volta para
        // o estado em que estava anteriormente".
      }
      setCurrentStepId(targetId)
    },
    [steps, currentStepId]
  )

  const allConfirmed = steps.every((s) => confirmed.has(s.id))

  return (
    <div className="flex flex-col gap-3" data-all-confirmed={allConfirmed}>
      {steps.map((step, idx) => {
        const state = stateOf(step.id)
        return (
          <AccordionStep
            key={step.id}
            state={state}
            number={idx + 1}
            title={step.title}
            summary={state === 'confirmed' ? step.summary : null}
            onEdit={state === 'confirmed' ? () => handleEdit(step.id) : undefined}
          >
            {step.render({
              onConfirm: () => handleConfirm(step.id),
              canConfirm: step.isValid,
            })}
          </AccordionStep>
        )
      })}
    </div>
  )
}
