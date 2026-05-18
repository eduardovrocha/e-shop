import api from './api'

export type TourStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'phase_2_ready'

export interface OnboardingProgress {
  status:                   TourStatus
  current_phase:            1 | 2
  current_step_id:          string | null
  completed_steps:          string[]
  skipped_steps:            string[]
  started_at:               string | null
  completed_at:             string | null
  last_seen_at:             string | null
  next_eligible_phase_2_at: string | null
}

export interface UpdateProgressPayload {
  current_step_id?: string | null
  completed_step?:  string
  skipped_step?:    string
  status?:          TourStatus
}

const BASE = '/admin/onboarding'

export const onboardingService = {
  fetch(): Promise<OnboardingProgress> {
    return api.get<OnboardingProgress>(`${BASE}/progress`).then((r) => r.data)
  },

  update(payload: UpdateProgressPayload): Promise<OnboardingProgress> {
    return api.patch<OnboardingProgress>(`${BASE}/progress`, payload).then((r) => r.data)
  },

  start(): Promise<OnboardingProgress> {
    return api.post<OnboardingProgress>(`${BASE}/progress/start`).then((r) => r.data)
  },

  completePhase(phase: 1 | 2): Promise<OnboardingProgress> {
    return api.post<OnboardingProgress>(`${BASE}/progress/complete-phase`, { phase }).then((r) => r.data)
  },

  skip(permanently: boolean): Promise<OnboardingProgress> {
    return api.post<OnboardingProgress>(`${BASE}/progress/skip`, { permanently }).then((r) => r.data)
  },

  reset(targetUserId?: number): Promise<OnboardingProgress> {
    return api
      .post<OnboardingProgress>(`${BASE}/progress/reset`, targetUserId ? { user_id: targetUserId } : {})
      .then((r) => r.data)
  },
}
