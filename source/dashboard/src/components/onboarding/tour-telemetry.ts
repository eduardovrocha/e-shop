/**
 * Frontend-side tour telemetry.
 *
 * The backend already emits structured `[telemetry]` lines when its
 * onboarding endpoints fire. This module covers the client-only events that
 * never round-trip — target misses, missed-step transitions, etc.
 *
 * Phase 6 replaces this stub with a real destination (PostHog, Segment, …).
 */
export type TourTelemetryEvent =
  | 'tour_step_target_missed'
  | 'tour_step_route_mismatch'

export function trackTourTelemetry(
  event: TourTelemetryEvent,
  payload: Record<string, unknown> = {},
): void {
  // eslint-disable-next-line no-console
  console.info('[tour-telemetry]', event, payload)
}
