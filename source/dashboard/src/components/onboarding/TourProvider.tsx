import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Joyride, ACTIONS, EVENTS, type EventData, type Step, type TooltipRenderProps } from 'react-joyride'
import { useLocation, useNavigate } from 'react-router-dom'
import { TourTooltip } from './TourTooltip'
import { TourModal } from './TourModal'
import { PHASE_1_STEPS } from './steps/phase1'
import { PHASE_2_STEPS } from './steps/phase2'
import { isStepEligible, type TourStepDefinition } from './steps/types'
import { trackTourTelemetry } from './tour-telemetry'
import { onboardingService, type OnboardingProgress, type TourStatus, type UpdateProgressPayload } from '@/services/onboardingService'

const PERSIST_DEBOUNCE_MS = 300
const TARGET_WAIT_TIMEOUT_MS = 2000

interface TourContextValue {
  loading:          boolean
  progress:         OnboardingProgress | null
  status:           TourStatus | null
  currentPhase:     1 | 2 | null
  currentStepId:    string | null
  completedSteps:   string[]
  visibleSteps:     TourStepDefinition[]
  start:            () => Promise<void>
  next:             () => void
  prev:             () => void
  skipStep:         () => void
  skipTour:         (opts: { permanently: boolean }) => Promise<void>
  completePhase:    (phase: 1 | 2) => Promise<void>
  resumeFromStep:   (stepId: string) => void
}

export const TourContext = createContext<TourContextValue | null>(null)

interface TourProviderProps {
  children: ReactNode
  /**
   * Disables backend sync during tests. The provider still renders so child
   * components can call useTour without crashing.
   */
  disableBackendSync?: boolean
}

export function TourProvider({ children, disableBackendSync = false }: TourProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [joyrideRun, setJoyrideRun] = useState(false)

  // Active phase derived from progress
  const currentPhase: 1 | 2 | null = progress?.current_phase ?? null

  const allSteps = useMemo<TourStepDefinition[]>(() => {
    if (currentPhase === 2) return PHASE_2_STEPS
    return PHASE_1_STEPS
  }, [currentPhase])

  const visibleSteps = useMemo(
    () => allSteps.filter(isStepEligible),
    [allSteps],
  )

  // ---------- Backend sync ----------------------------------------------------

  const persistTimer = useRef<number | null>(null)

  const queuePersist = useCallback((payload: UpdateProgressPayload) => {
    if (disableBackendSync) return
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      onboardingService.update(payload).then(setProgress).catch(() => {
        // Backend offline: tour keeps working client-side, syncs on next mutation
      })
    }, PERSIST_DEBOUNCE_MS)
  }, [disableBackendSync])

  useEffect(() => {
    if (disableBackendSync) {
      setLoading(false)
      return
    }
    let cancelled = false
    onboardingService
      .fetch()
      .then((p) => {
        if (cancelled) return
        setProgress(p)
        // Restore stepIndex from current_step_id
        if (p.current_step_id) {
          const phaseSteps = p.current_phase === 2 ? PHASE_2_STEPS : PHASE_1_STEPS
          const idx = phaseSteps.findIndex((s) => s.id === p.current_step_id)
          if (idx >= 0) setStepIndex(idx)
        }
      })
      .catch(() => { /* silently fail per EC6 */ })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [disableBackendSync])

  // ---------- Navigation between steps ---------------------------------------

  const waitForTarget = useCallback(async (selector: string): Promise<boolean> => {
    if (document.querySelector(selector)) return true
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect()
          window.clearTimeout(timeoutId)
          resolve(true)
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      const timeoutId = window.setTimeout(() => {
        observer.disconnect()
        resolve(false)
      }, TARGET_WAIT_TIMEOUT_MS)
    })
  }, [])

  const goToStep = useCallback(async (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= visibleSteps.length) return

    const step = visibleSteps[nextIndex]

    // 1. Navigate if route does not match
    if (step.route && step.route !== location.pathname) {
      navigate(step.route)
      trackTourTelemetry('tour_step_route_mismatch', { step_id: step.id, from: location.pathname, to: step.route })
    }

    // 2. Wait for target to mount (only relevant for positioned tooltips)
    if (step.target) {
      const found = await waitForTarget(step.target)
      if (!found) {
        trackTourTelemetry('tour_step_target_missed', { step_id: step.id, target: step.target })
        // Skip past it silently — try next eligible step
        return goToStep(nextIndex + 1)
      }
    }

    setStepIndex(nextIndex)
    queuePersist({ current_step_id: step.id })
  }, [visibleSteps, location.pathname, navigate, waitForTarget, queuePersist])

  // ---------- Public API ------------------------------------------------------

  const start = useCallback(async () => {
    if (!disableBackendSync) {
      try { setProgress(await onboardingService.start()) } catch { /* offline ok */ }
    }
    setStepIndex(0)
    setJoyrideRun(true)
  }, [disableBackendSync])

  const next = useCallback(() => {
    void goToStep(stepIndex + 1)
  }, [goToStep, stepIndex])

  const prev = useCallback(() => {
    void goToStep(stepIndex - 1)
  }, [goToStep, stepIndex])

  const skipStep = useCallback(() => {
    const current = visibleSteps[stepIndex]
    if (current) queuePersist({ skipped_step: current.id })
    void goToStep(stepIndex + 1)
  }, [visibleSteps, stepIndex, queuePersist, goToStep])

  const skipTour = useCallback(async ({ permanently }: { permanently: boolean }) => {
    setJoyrideRun(false)
    if (!disableBackendSync) {
      try { setProgress(await onboardingService.skip(permanently)) } catch { /* offline ok */ }
    }
  }, [disableBackendSync])

  const completePhase = useCallback(async (phase: 1 | 2) => {
    setJoyrideRun(false)
    if (!disableBackendSync) {
      try { setProgress(await onboardingService.completePhase(phase)) } catch { /* offline ok */ }
    }
  }, [disableBackendSync])

  const resumeFromStep = useCallback((stepId: string) => {
    const idx = visibleSteps.findIndex((s) => s.id === stepId)
    if (idx >= 0) {
      setStepIndex(idx)
      setJoyrideRun(true)
    }
  }, [visibleSteps])

  const value = useMemo<TourContextValue>(() => ({
    loading,
    progress,
    status:         progress?.status ?? null,
    currentPhase,
    currentStepId:  visibleSteps[stepIndex]?.id ?? null,
    completedSteps: progress?.completed_steps ?? [],
    visibleSteps,
    start,
    next,
    prev,
    skipStep,
    skipTour,
    completePhase,
    resumeFromStep,
  }), [
    loading, progress, currentPhase, visibleSteps, stepIndex,
    start, next, prev, skipStep, skipTour, completePhase, resumeFromStep,
  ])

  // ---------- Joyride steps ---------------------------------------------------

  const positionedSteps = useMemo(
    () => visibleSteps.filter((s) => !s.asModal),
    [visibleSteps],
  )

  const positionedStepIndex = useMemo(() => {
    const current = visibleSteps[stepIndex]
    if (!current) return 0
    const idx = positionedSteps.findIndex((s) => s.id === current.id)
    return idx >= 0 ? idx : 0
  }, [visibleSteps, stepIndex, positionedSteps])

  const joyrideSteps = useMemo<Step[]>(
    () => positionedSteps.map((s) => ({
      target:   s.target ?? 'body',
      content:  s.body,
      title:    s.title,
      placement: s.position ?? 'bottom',
      disableBeacon: true,
      data: { stepId: s.id, phase: s.phase },
    })),
    [positionedSteps],
  )

  const handleJoyrideEvent = useCallback((data: EventData) => {
    const { action, type } = data
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) next()
      else if (action === ACTIONS.PREV) prev()
      else if (action === ACTIONS.SKIP || action === ACTIONS.CLOSE) {
        void skipTour({ permanently: false })
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      const current = visibleSteps[stepIndex]
      if (current) trackTourTelemetry('tour_step_target_missed', { step_id: current.id, target: current.target })
      next()
    }
  }, [next, prev, skipTour, visibleSteps, stepIndex])

  // Render the current asModal step (if any) outside Joyride
  const currentStep = visibleSteps[stepIndex]
  const showAsModal = joyrideRun && currentStep?.asModal === true

  const isLastInPhase = stepIndex === visibleSteps.length - 1

  function TooltipRenderer(props: TooltipRenderProps) {
    const stepIdx = props.index
    const stepDef = positionedSteps[stepIdx]
    if (!stepDef) return null
    return (
      <TourTooltip
        title={stepDef.title}
        body={stepDef.body}
        stepIndex={visibleSteps.findIndex((s) => s.id === stepDef.id)}
        totalSteps={visibleSteps.length}
        phase={stepDef.phase}
        position={stepDef.position}
        isFirstStep={stepIdx === 0}
        isLastStep={stepIdx === positionedSteps.length - 1}
        onPrev={() => props.backProps.onClick({} as React.MouseEvent<HTMLElement>)}
        onNext={() => props.primaryProps.onClick({} as React.MouseEvent<HTMLElement>)}
        onSkip={() => props.skipProps.onClick({} as React.MouseEvent<HTMLElement>)}
      />
    )
  }

  return (
    <TourContext.Provider value={value}>
      {children}

      {joyrideRun && joyrideSteps.length > 0 && (
        <Joyride
          steps={joyrideSteps}
          run={joyrideRun}
          stepIndex={positionedStepIndex}
          continuous
          onEvent={handleJoyrideEvent}
          tooltipComponent={TooltipRenderer}
          options={{
            hideOverlay:     true,
            overlayColor:    'transparent',
            primaryColor:    '#4F46E5',
            spotlightRadius: 8,
            zIndex:          9999,
            arrowSize:       8,
          }}
        />
      )}

      {showAsModal && currentStep && (
        <TourModal
          open
          title={currentStep.title}
          body={<p>{currentStep.body}</p>}
          primaryAction={{
            label: isLastInPhase ? 'Fechar' : 'Próximo →',
            onClick: () => {
              if (isLastInPhase) {
                void completePhase(currentStep.phase)
              } else {
                next()
              }
            },
          }}
          secondaryAction={
            stepIndex === 0
              ? { label: 'Pular por agora', onClick: () => void skipTour({ permanently: false }) }
              : undefined
          }
          onDismiss={() => void skipTour({ permanently: false })}
        />
      )}
    </TourContext.Provider>
  )
}
