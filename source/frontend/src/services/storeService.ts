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
  // Raw store-level toggle (StoreSetting.pickup_enabled). Kept for backwards
  // compatibility; the storefront should usually use `pickup_available`.
  pickup_enabled: boolean
  // Effective availability — backend ANDs StoreSetting.pickup_enabled with
  // ShippingSetting.local_pickup_enabled, so either switch being off
  // disables the "Retirada presencial" card in the cart.
  pickup_available: boolean
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
