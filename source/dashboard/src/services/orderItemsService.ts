import api from './api'

export type ProductionStatus =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'canceled'

export interface AdminOrderItem {
  id: number
  order_id: number
  order_number: string | null
  order_status: string
  customer_name: string | null
  customer_email: string | null
  product_id: number | null
  product_name: string
  product_variant_id: number | null
  size: string | null
  color: string | null
  fulfillment_mode: 'from_stock' | 'made_to_order' | null
  production_capacity: number | null
  production_lead_time_days: number | null
  cancellation_refund_percentage: number | null
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
  production_status: ProductionStatus
  promised_completion_date: string | null
  production_started_at: string | null
  production_completed_at: string | null
  created_at: string
}

export interface OrderItemsListParams {
  production_status?: string
  order_status?: string
  fulfillment_mode?: string
  had_production?: boolean
  product_id?: number
  q?: string
  sort?: string
  page?: number
  per_page?: number
}

export interface OrderItemsListResponse {
  order_items: AdminOrderItem[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}

export interface CancelOrderItemResponse {
  order_item_id: number
  refund_amount_cents: number
  refund_percentage: number
  stripe_refund_id: string
  new_order_status: string
  production_status: ProductionStatus
}

export const orderItemsService = {
  list: (params: OrderItemsListParams = {}) =>
    api.get<OrderItemsListResponse>('/admin/order_items', { params }).then((r) => r.data),

  startProduction: (id: number) =>
    api.patch<AdminOrderItem>(`/admin/order_items/${id}/start_production`).then((r) => r.data),

  completeProduction: (id: number) =>
    api.patch<AdminOrderItem>(`/admin/order_items/${id}/complete_production`).then((r) => r.data),

  cancel: (id: number, reason?: string) =>
    api.patch<CancelOrderItemResponse>(`/admin/order_items/${id}/cancel`, { reason }).then((r) => r.data),
}
