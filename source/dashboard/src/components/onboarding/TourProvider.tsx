import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Joyride, ACTIONS, EVENTS, type EventData, type Step, type TooltipRenderProps } from 'react-joyride'
import { useLocation, useNavigate } from 'react-router-dom'
import { TourTooltip } from './TourTooltip'
import { TourModal } from './TourModal'
import { SkipTourModal } from './SkipTourModal'
import { TourViewportGuard } from './TourViewportGuard'
import { useViewportTooNarrow } from './useViewportGuard'
import { PHASE_1_STEPS } from './steps/phase1'
import { PHASE_2_STEPS } from './steps/phase2'
import { latestPaidOrderId } from './steps/conditions'
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
  requestSkip:      () => void
  completePhase:    (phase: 1 | 2) => Promise<void>
  resumeFromStep:   (stepId: string) => void
  replayTour:       () => Promise<void>
}

export const TourContext = createContext<TourContextValue | null>(null)

interface TourProviderProps {
  children: ReactNode
  /**
   * Disables backend sync during tests. The provider still renders so child
   * components can call useTour without crashing.
   */
  disableBackendSync?: boolean
  /** Disable automatic welcome / resume effect (used by unit tests). */
  disableAutoTrigger?: boolean
}

export function TourProvider({
  children,
  disableBackendSync = false,
  disableAutoTrigger = false,
}: TourProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const viewportTooNarrow = useViewportTooNarrow()

  const [progress,   setProgress]   = useState<OnboardingProgress | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [stepIndex,  setStepIndex]  = useState(0)
  const [joyrideRun, setJoyrideRun] = useState(false)
  const [skipModalOpen, setSkipModalOpen] = useState(false)
  const [viewportGuardDismissed, setViewportGuardDismissed] = useState(false)
  const [resolvedOrderId, setResolvedOrderId] = useState<number | null>(null)

  // Time-on-step tracker for the spec section 11 telemetry property. We
  // capture an entry timestamp every time the user lands on a step and
  // compute the delta on transition.
  const stepEnteredAtRef = useRef<number>(Date.now())

  const currentPhase: 1 | 2 | null = progress?.current_phase ?? null

  const allSteps = useMemo<TourStepDefinition[]>(() => {
    if (currentPhase === 2) return PHASE_2_STEPS
    return PHASE_1_STEPS
  }, [currentPhase])

  // `visibleSteps` is resolved asynchronously because conditions may probe
  // the backend. While the resolution runs we expose the synchronous subset
  // so the UI never blocks on a slow probe.
  const [visibleSteps, setVisibleSteps] = useState<TourStepDefinition[]>(() =>
    allSteps.filter((s) => s.enabled !== false && !s.condition),
  )

  useEffect(() => {
    let cancelled = false
    Promise.all(allSteps.map((s) => Promise.resolve(isStepEligible(s)).then((ok) => ({ s, ok }))))
      .then((results) => {
        if (cancelled) return
        setVisibleSteps(results.filter((r) => r.ok).map((r) => r.s))
      })
      .catch(() => { /* keep current visibleSteps */ })
    return () => { cancelled = true }
  }, [allSteps])

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

  // ---------- Auto-trigger: first login + resume ------------------------------

  const autoTriggered = useRef(false)

  useEffect(() => {
    if (disableAutoTrigger) return
    if (loading || !progress || autoTriggered.current) return
    if (joyrideRun) return

    const triggers = [ 'not_started', 'in_progress', 'phase_2_ready' ]
    if (triggers.includes(progress.status)) {
      autoTriggered.current = true
      setJoyrideRun(true)
    }
  }, [loading, progress, joyrideRun, disableAutoTrigger])

  // When Phase 2 kicks in, fetch the latest paid order so step 2.1's
  // `/orders/:id` route can be resolved dynamically.
  useEffect(() => {
    if (disableBackendSync) return
    if (currentPhase !== 2) return
    if (resolvedOrderId !== null) return

    let cancelled = false
    latestPaidOrderId().then((id) => { if (!cancelled && id !== null) setResolvedOrderId(id) })
    return () => { cancelled = true }
  }, [currentPhase, resolvedOrderId, disableBackendSync])

  // ---------- Highlight ring on the current step's target --------------------
  //
  // Visual spec section 6 — instead of dimming the page, mark the focused
  // element with a pulsing ring. We toggle the .tour-highlight class
  // imperatively on the current step's target so the highlight follows the
  // tooltip from step to step. The target may not be mounted at the exact
  // moment stepIndex flips (route navigation is async), so a MutationObserver
  // catches it as soon as it lands.

  useEffect(() => {
    const current = visibleSteps[stepIndex]
    if (!joyrideRun || !current || current.asModal || !current.target) return

    const selector = current.target
    let node: Element | null = document.querySelector(selector)
    if (node) node.classList.add('tour-highlight')

    let observer: MutationObserver | null = null
    if (!node) {
      observer = new MutationObserver(() => {
        const found = document.querySelector(selector)
        if (found) {
          node = found
          node.classList.add('tour-highlight')
          observer?.disconnect()
          observer = null
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer?.disconnect()
      node?.classList.remove('tour-highlight')
    }
  }, [stepIndex, visibleSteps, joyrideRun])

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

  const resolveRoute = useCallback((route: string): string => {
    if (route.includes(':id') && resolvedOrderId !== null) {
      return route.replace(':id', String(resolvedOrderId))
    }
    return route
  }, [resolvedOrderId])

  const goToStep = useCallback(async (nextIndex: number, completedPrevious = false) => {
    if (nextIndex < 0 || nextIndex >= visibleSteps.length) return

    const previousStep = visibleSteps[stepIndex]
    const step         = visibleSteps[nextIndex]
    const targetRoute  = resolveRoute(step.route)
    const elapsedMs    = Date.now() - stepEnteredAtRef.current

    if (step.route && targetRoute !== location.pathname) {
      navigate(targetRoute)
      trackTourTelemetry('tour_step_route_mismatch', { step_id: step.id, from: location.pathname, to: targetRoute })
    }

    if (step.target) {
      const found = await waitForTarget(step.target)
      if (!found) {
        trackTourTelemetry('tour_step_target_missed', { step_id: step.id, target: step.target })
        return goToStep(nextIndex + 1)
      }
    }

    setStepIndex(nextIndex)
    queuePersist({
      current_step_id: step.id,
      ...(completedPrevious && previousStep ? {
        completed_step:  previousStep.id,
        time_on_step_ms: elapsedMs,
      } : {}),
    })
    stepEnteredAtRef.current = Date.now()
  }, [visibleSteps, stepIndex, location.pathname, navigate, waitForTarget, queuePersist, resolveRoute])

  // ---------- Public API ------------------------------------------------------

  const start = useCallback(async () => {
    setJoyrideRun(true)
    if (!disableBackendSync) {
      try { setProgress(await onboardingService.start()) } catch { /* offline ok */ }
    }
  }, [disableBackendSync])

  const next = useCallback(() => {
    void goToStep(stepIndex + 1, /* completedPrevious */ true)
  }, [goToStep, stepIndex])

  const prev = useCallback(() => {
    void goToStep(stepIndex - 1)
  }, [goToStep, stepIndex])

  const skipStep = useCallback(() => {
    const current   = visibleSteps[stepIndex]
    const elapsedMs = Date.now() - stepEnteredAtRef.current
    if (current) queuePersist({ skipped_step: current.id, time_on_step_ms: elapsedMs })
    void goToStep(stepIndex + 1)
  }, [visibleSteps, stepIndex, queuePersist, goToStep])

  const skipTour = useCallback(async ({ permanently }: { permanently: boolean }) => {
    setJoyrideRun(false)
    setSkipModalOpen(false)
    if (!disableBackendSync) {
      try { setProgress(await onboardingService.skip(permanently)) } catch { /* offline ok */ }
    }
  }, [disableBackendSync])

  const requestSkip = useCallback(() => setSkipModalOpen(true), [])

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

  // "Refazer tour" — user-initiated full reset (spec section 5.4 + 12.7).
  const replayTour = useCallback(async () => {
    setJoyrideRun(false)
    setStepIndex(0)
    setSkipModalOpen(false)
    autoTriggered.current = false
    if (!disableBackendSync) {
      try { setProgress(await onboardingService.reset()) } catch { /* offline ok */ }
    } else {
      // Test path: synthesize a not_started progress so the entry flow kicks in.
      setProgress({
        status:                   'not_started',
        current_phase:            1,
        current_step_id:          null,
        completed_steps:          [],
        skipped_steps:            [],
        started_at:               null,
        completed_at:             null,
        last_seen_at:             null,
        next_eligible_phase_2_at: null,
      })
    }
    setJoyrideRun(true)
  }, [disableBackendSync])

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
    requestSkip,
    completePhase,
    resumeFromStep,
    replayTour,
  }), [
    loading, progress, currentPhase, visibleSteps, stepIndex,
    start, next, prev, skipStep, skipTour, requestSkip,
    completePhase, resumeFromStep, replayTour,
  ])

  // ---------- Joyride wiring --------------------------------------------------

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
      target:        s.target ?? 'body',
      content:       s.body,
      title:         s.title,
      placement:     s.position ?? 'bottom',
      disableBeacon: true,
      data:          { stepId: s.id, phase: s.phase },
    })),
    [positionedSteps],
  )

  const handleJoyrideEvent = useCallback((data: EventData) => {
    const { action, type } = data
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) next()
      else if (action === ACTIONS.PREV) prev()
      else if (action === ACTIONS.SKIP || action === ACTIONS.CLOSE) {
        requestSkip()
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      const current = visibleSteps[stepIndex]
      if (current) trackTourTelemetry('tour_step_target_missed', { step_id: current.id, target: current.target })
      next()
    }
  }, [next, prev, requestSkip, visibleSteps, stepIndex])

  const currentStep = visibleSteps[stepIndex]
  const showAsModal = joyrideRun && currentStep?.asModal === true
  const isLastInPhase = stepIndex === visibleSteps.length - 1
  const isWelcome      = currentStep?.id === 'welcome'
  const isPhase2Entry  = currentStep?.id === 'phase_2_entry'
  const isEntryModal   = isWelcome || isPhase2Entry

  const dismissPhase2Entry = useCallback(() => {
    // "Agora não" — close the modal for this session. Status stays
    // phase_2_ready on the backend, so the next page-load (full mount,
    // fresh autoTriggered ref) brings the modal back. We do NOT reset
    // autoTriggered here, otherwise the effect would re-fire and the
    // modal would never close in the current session.
    setJoyrideRun(false)
  }, [])

  function TooltipRenderer(props: TooltipRenderProps) {
    const stepIdx = props.index
    const stepDef = positionedSteps[stepIdx]
    if (!stepDef) return null
    // Controlled mode: bypass Joyride's button-event machinery and call our
    // provider methods directly. Going through `primaryProps.onClick` with a
    // synthetic MouseEvent leaves Joyride's controls.next() in a half-fired
    // state and the STEP_AFTER event never reaches our onEvent handler, so
    // "Próximo" appears to do nothing. Talking to the provider is also more
    // predictable — we already own stepIndex.
    //
    // Use Joyride's *resolved* placement (after viewport-collision flips)
    // instead of the desired one so the CSS arrow lands on the right edge.
    const resolved = props.step.placement as string | undefined
    const resolvedPosition =
      resolved === 'top' || resolved === 'bottom' || resolved === 'left' || resolved === 'right'
        ? resolved
        : stepDef.position
    return (
      <TourTooltip
        title={stepDef.title}
        body={stepDef.body}
        stepIndex={visibleSteps.findIndex((s) => s.id === stepDef.id)}
        totalSteps={visibleSteps.length}
        phase={stepDef.phase}
        position={resolvedPosition}
        isFirstStep={stepIdx === 0}
        isLastStep={stepIdx === positionedSteps.length - 1}
        onPrev={prev}
        onNext={next}
        onSkip={requestSkip}
      />
    )
  }

  // Viewport guard short-circuit: when the tour wants to run on a narrow
  // viewport, show the explanatory card and pause everything else.
  if (joyrideRun && viewportTooNarrow && !viewportGuardDismissed) {
    return (
      <TourContext.Provider value={value}>
        {children}
        <TourViewportGuard onDismiss={() => {
          setViewportGuardDismissed(true)
          setJoyrideRun(false)
        }} />
      </TourContext.Provider>
    )
  }

  return (
    <TourContext.Provider value={value}>
      {children}

      {joyrideRun && joyrideSteps.length > 0 && !showAsModal && (
        <Joyride
          steps={joyrideSteps}
          run={joyrideRun}
          stepIndex={positionedStepIndex}
          continuous
          onEvent={handleJoyrideEvent}
          tooltipComponent={TooltipRenderer}
          options={{
            hideOverlay:      true,
            overlayColor:     'transparent',
            primaryColor:     '#4F46E5',
            spotlightRadius:  8,
            zIndex:           9999,
            arrowSize:        8,
            // Never auto-scroll between steps — if the next target is
            // already visible, leave the page where the user put it.
            // Joyride still flips placement on viewport collisions, so a
            // step at the edge stays usable without yanking the scroll.
            skipScroll: true,
          }}
        />
      )}

      {showAsModal && currentStep && (
        <TourModal
          open
          title={currentStep.title}
          body={<p>{currentStep.body}</p>}
          primaryAction={{
            label:
              isWelcome      ? 'Começar tour →' :
              isPhase2Entry  ? 'Sim, mostrar →' :
              isLastInPhase  ? 'Fechar' :
                               'Próximo →',
            onClick: () => {
              if (isEntryModal) {
                void start().then(() => next())
              } else if (isLastInPhase) {
                void completePhase(currentStep.phase)
              } else {
                next()
              }
            },
          }}
          secondaryAction={
            isWelcome      ? { label: 'Pular por agora', onClick: requestSkip } :
            isPhase2Entry  ? { label: 'Agora não',       onClick: dismissPhase2Entry } :
                             undefined
          }
          onDismiss={
            isWelcome      ? requestSkip :
            isPhase2Entry  ? dismissPhase2Entry :
                             () => void completePhase(currentStep.phase)
          }
        />
      )}

      <SkipTourModal
        open={skipModalOpen}
        onSkipNow={() => void skipTour({ permanently: false })}
        onSkipPermanently={() => void skipTour({ permanently: true })}
        onContinue={() => setSkipModalOpen(false)}
      />
    </TourContext.Provider>
  )
}
