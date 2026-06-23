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
  // Profit fields (admin-only). All nullable when cost was not captured
  // at purchase time (legacy data or admin hadn't set unit_cost_cents).
  // UI must render "—" / "Custo não definido" rather than treating null
  // as zero, otherwise margin would falsely show as 100%.
  unit_cost_cents: number | null
  cost_subtotal_cents: number | null
  gross_profit_cents: number | null
  margin_percentage: number | null
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

export type OrderSource = 'web' | 'manual'
export type ExternalPaymentMethod = 'pix' | 'transferencia' | 'cartao' | 'dinheiro'

export interface Order {
  id: number
  number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  // CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) já formatado pelo
  // backend. Pedidos legados (pré-migration) ficam com nil. tax_id_kind
  // identifica o tipo para rotulagem correta em views.
  tax_id_formatted: string | null
  tax_id_kind: 'cpf' | 'cnpj' | null
  status: OrderStatus
  source?: OrderSource
  external_payment_method?: ExternalPaymentMethod | null
  delivery_method: DeliveryMethod
  items: OrderItem[]
  order_items?: OrderItemRow[]
  promised_completion_date?: string | null
  items_total_cents: number
  shipping_fee_cents: number
  total_cents: number
  // Aggregated profit metrics (admin-only). All four collapse to null
  // when no items have unit_cost_cents — UI renders a "Definir custos"
  // CTA. When SOME items have cost and others don't, numbers reflect
  // only the items with cost and items_missing_cost_count > 0 surfaces
  // the gap so the operator knows the rollup is partial.
  total_cost_cents: number | null
  order_gross_profit_cents: number | null
  order_margin_percentage: number | null
  items_with_cost_count: number
  items_missing_cost_count: number
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
