import api from './api'
import type { VariantGender, VariantCut } from '@/types/product'

export type TrackingProductionStatus =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'canceled'

export interface TrackingItem {
  name: string
  size: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

export interface TrackingOrderItem {
  id: number
  name: string
  size: string | null
  gender: VariantGender | null
  cut: VariantCut | null
  quantity: number
  subtotal_cents: number
  production_status: TrackingProductionStatus
  promised_completion_date: string | null
  fulfillment_mode: 'from_stock' | 'made_to_order' | null
  cancellation_refund_percentage: number | null
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
  promised_completion_date: string | null
  tracking_code: string | null
  carrier: string | null
  shipping_service: string | null
  items: TrackingItem[]
  order_items?: TrackingOrderItem[]
  items_total_cents: number
  shipping_fee_cents: number
  total_cents: number
  timeline: TrackingTimeline[]
}

export interface CancelItemResponse {
  order_item_id: number
  refund_amount_cents: number
  refund_percentage: number
  stripe_refund_id: string
  new_order_status: string
  production_status: TrackingProductionStatus
}

export const trackingService = {
  get: (token: string) =>
    api.get<TrackingOrder>(`/orders/track/${token}`).then((r) => r.data),

  cancelItem: (token: string, itemId: number, reason?: string) =>
    api.patch<CancelItemResponse>(
      `/orders/track/${token}/items/${itemId}/cancel`,
      { reason }
    ).then((r) => r.data),
}
