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
  headline_primary: string
  headline_secondary: string
  headline_description: string
  footer_description: string
}

export interface HeadlineSettings {
  headline_primary?: string
  headline_secondary?: string
  headline_description?: string
  footer_description?: string
}

export const settingsService = {
  get: () => api.get<StoreSettings>('/admin/settings').then((r) => r.data),
  update: (data: Partial<StoreSettings>) =>
    api.patch<StoreSettings>('/admin/settings', { store_setting: data }).then((r) => r.data),
  updateHeadline: (data: HeadlineSettings) =>
    api.put<HeadlineSettings>('/store_settings', data).then((r) => r.data),
}
