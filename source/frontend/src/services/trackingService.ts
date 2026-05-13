import api from './api'

export interface TrackingItem {
  name: string
  size: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

export interface TrackingTimeline {
  status: string
  title: string
  description: string | null
  created_at: string
}

export interface TrackingOrder {
  number: string
  status: string
  status_label: string
  delivery_method: 'delivery' | 'pickup'
  created_at: string
  estimated_delivery: string | null
  tracking_code: string | null
  carrier: string | null
  shipping_service: string | null
  items: TrackingItem[]
  items_total_cents: number
  shipping_fee_cents: number
  total_cents: number
  timeline: TrackingTimeline[]
}

export const trackingService = {
  get: (token: string) =>
    api.get<TrackingOrder>(`/orders/track/${token}`).then((r) => r.data),
}
