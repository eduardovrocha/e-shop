import type { TourTooltipPosition } from '../TourTooltip'

/**
 * A single tour step. The `id` is stable across versions (used as the
 * persistence key in `completed_steps`); reordering or renaming steps later
 * does not invalidate prior completion records.
 */
export interface TourStepDefinition {
  /** Stable identifier persisted to the backend. */
  id: string

  /** Tour phase this step belongs to (1 = setup, 2 = operational). */
  phase: 1 | 2

  /** Route that must be active for the step to render. */
  route: string

  /**
   * CSS selector for the target element. For modal-style steps
   * (welcome, completion) leave `null` to render in centered modal mode.
   */
  target: string | null

  /** Localized title shown in the tooltip / modal header. */
  title: string

  /** Localized body text. */
  body: string

  /** Tooltip position relative to the target (ignored when target is null). */
  position?: TourTooltipPosition

  /**
   * If false, the step is silently skipped at runtime. Used to gate steps
   * whose target features are not yet implemented in the dashboard (e.g.
   * the CMS or the shipping workflow page).
   */
  enabled?: boolean

  /**
   * Optional runtime predicate. If returns false the step is skipped.
   * Useful for steps that only apply to certain store configurations
   * (e.g. step 1.7 only when the user just created a made-to-order product).
   */
  condition?: () => boolean

  /**
   * Render as a centered modal instead of a positioned tooltip.
   * Used for boas-vindas, conclusão e abertura da Fase 2.
   */
  asModal?: boolean
}

/**
 * Returns whether a step is currently eligible to render. Steps explicitly
 * disabled (or with a condition that resolves to false) are skipped.
 */
export function isStepEligible(step: TourStepDefinition): boolean {
  if (step.enabled === false) return false
  if (!step.condition)        return true
  try {
    return Boolean(step.condition())
  } catch {
    return false
  }
}
