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

export const storeService = {
  get: () => api.get<StoreInfo>('/store').then((r) => r.data),
}
