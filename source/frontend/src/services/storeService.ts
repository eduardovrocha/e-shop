import api from '@/services/api'

export interface StoreInfo {
  event_name: string
  edition: string
  shipping_fee_cents: number
  free_shipping_above_cents: number
  pickup_zipcode: string
  pickup_street: string
  pickup_number: string
  pickup_complement: string
  pickup_city: string
  pickup_state: string
}

export interface StoreHeadline {
  headline_primary: string
  headline_secondary: string
  headline_description: string
  footer_description: string
  contact_email: string
  whatsapp_number: string
}

export const storeService = {
  get: () => api.get<StoreInfo>('/store').then((r) => r.data),
  getHeadline: () => api.get<StoreHeadline>('/store_settings').then((r) => r.data),
}
