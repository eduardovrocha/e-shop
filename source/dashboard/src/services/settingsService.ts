import api from './api'

export interface StoreSettings {
  event_name: string
  edition: string
  contact_email: string
  pickup_address: string
  pickup_zipcode: string
  pickup_street: string
  pickup_number: string
  pickup_complement: string
  pickup_city: string
  pickup_state: string
  whatsapp_number: string
  free_shipping_above_cents: number
  shipping_fee_cents: number
}

export interface StripeInfo {
  mode: 'test' | 'live' | 'unknown'
  publishable_key_hint: string
  secret_key_hint: string
}

export const settingsService = {
  get: () => api.get<StoreSettings>('/admin/settings').then((r) => r.data),
  update: (data: Partial<StoreSettings>) =>
    api.patch<StoreSettings>('/admin/settings', { store_setting: data }).then((r) => r.data),
  stripeInfo: () => api.get<StripeInfo>('/admin/settings/stripe_info').then((r) => r.data),
}
