import api from './api'

export type StripeMode = 'test' | 'live'

export interface StripeModeCredentialsSummary {
  publishable_key_configured: boolean
  publishable_key_hint: string
  secret_key_configured: boolean
  secret_key_hint: string
  webhook_secret_configured: boolean
  webhook_secret_hint: string
}

export interface StripeModeChangeEntry {
  admin_email: string | null
  previous_mode: StripeMode
  new_mode: StripeMode
  ip_address: string | null
  created_at: string
}

export interface StripeSettingsResponse {
  active_mode: StripeMode
  test: StripeModeCredentialsSummary
  live: StripeModeCredentialsSummary
  recent_changes: StripeModeChangeEntry[]
}

export interface StripeSettingsUpdatePayload {
  test_publishable_key?: string
  test_secret_key?: string
  test_webhook_secret?: string
  live_publishable_key?: string
  live_secret_key?: string
  live_webhook_secret?: string
}

export interface StripeSwitchModePayload {
  new_mode: StripeMode
  confirmation_phrase?: string
}

export const stripeSettingsService = {
  get: () =>
    api.get<StripeSettingsResponse>('/admin/stripe_setting').then((r) => r.data),

  update: (payload: StripeSettingsUpdatePayload) =>
    api
      .patch('/admin/stripe_setting', { stripe_setting: payload })
      .then((r) => r.data),

  switchMode: (payload: StripeSwitchModePayload) =>
    api
      .post('/admin/stripe_setting/switch_mode', payload)
      .then((r) => r.data),
}
