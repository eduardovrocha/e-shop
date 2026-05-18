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
   * Supports async checks (e.g. querying the API for the latest product's
   * `fulfillment_mode` to decide if the production step applies).
   */
  condition?: () => boolean | Promise<boolean>

  /**
   * Render as a centered modal instead of a positioned tooltip.
   * Used for boas-vindas, conclusão e abertura da Fase 2.
   */
  asModal?: boolean
}

/**
 * Resolves whether a step is currently eligible to render.
 *
 * Synchronous fast-path:
 *   - `enabled === false` → not eligible
 *   - no `condition` → eligible
 *   - sync `condition` → its truthiness
 *
 * Async fallback when `condition` returns a Promise. Failures resolve to
 * not-eligible — the safer default if a backend probe fails mid-tour.
 */
export function isStepEligible(step: TourStepDefinition): boolean | Promise<boolean> {
  if (step.enabled === false) return false
  if (!step.condition)        return true
  try {
    const result = step.condition()
    if (result instanceof Promise) {
      return result.then(Boolean).catch(() => false)
    }
    return Boolean(result)
  } catch {
    return false
  }
}
