export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'ready_to_ship'
  | 'producing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'disputed'

export type ProductionStatus =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'canceled'

import type { VariantGender, VariantCut } from '@/types/product'

export interface OrderItemRow {
  id: number
  product_variant_id: number | null
  product_id: number | null
  name: string
  size: string | null
  // Derived from the linked product_variant. Null when the variant has
  // since been deleted, or for orders predating gender/cut support.
  gender: VariantGender | null
  cut: VariantCut | null
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
  production_status: ProductionStatus
  promised_completion_date: string | null
  production_started_at: string | null
  production_completed_at: string | null
  fulfillment_mode: 'from_stock' | 'made_to_order' | null
  cancellation_refund_percentage: number | null
}

export type DeliveryMethod = 'delivery' | 'pickup'
export type PaymentMethod = 'stripe' | 'pix'

export interface OrderItem {
  id?: number
  variant_id: number
  name: string
  size: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

export interface ShippingAddress {
  address: string
  number: string
  complement?: string
  neighborhood?: string
  city: string
  state: string
  cep: string
}

export interface OrderStatusHistory {
  id: number
  status: OrderStatus
  title: string
  description: string | null
  created_by: string | null
  created_at: string
}

export interface Order {
  id: number
  number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  status: OrderStatus
  delivery_method: DeliveryMethod
  items: OrderItem[]
  order_items?: OrderItemRow[]
  promised_completion_date?: string | null
  items_total_cents: number
  shipping_fee_cents: number
  total_cents: number
  shipping_address?: ShippingAddress
  stripe_intent_id?: string
  tracking_token?: string
  tracking_url?: string
  tracking_code?: string
  notes?: string
  carrier?: string
  shipping_service?: string
  estimated_delivery?: string
  status_histories?: OrderStatusHistory[]
  created_at: string
  updated_at: string
}

export interface OrdersResponse {
  orders: Order[]
  meta: PaginationMeta
}

export interface PaginationMeta {
  current_page: number
  total_pages: number
  total_count: number
  per_page: number
}
