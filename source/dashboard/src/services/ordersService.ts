import api from './api'
import type { Order, OrdersResponse } from '@/types/order'
import type { ExternalPaymentMethod, ShippingMode } from '@/lib/manualOrder'

export interface OrdersParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  source?: string
}

export interface OrderUpdateData {
  status?: string
  tracking_code?: string
  notes?: string
  carrier?: string
  shipping_service?: string
  estimated_delivery?: string
}

export interface ManualOrderItemPayload {
  variant_id: number
  quantity: number
  unit_price_cents: number
}

export interface ManualOrderAddressPayload {
  cep: string
  address: string
  city: string
  state: string
  neighborhood?: string
  // Número e complemento espelham o JSONB shipping_address que o checkout
  // web já popula — paridade unidirecional (web → admin manual).
  number: string
  complement?: string
}

export interface ManualOrderPayload {
  // tax_id em dígitos crus (sem máscara). Backend normaliza e valida.
  customer: { name: string; email?: string; phone?: string; tax_id: string }
  items: ManualOrderItemPayload[]
  external_payment_method: ExternalPaymentMethod
  paid_at?: string
  shipping_mode: ShippingMode
  shipping_address?: ManualOrderAddressPayload | null
  shipping_fee_cents?: number
  manual_shipping_cost_cents?: number
  carrier?: string
  shipping_service?: string
  manual_discount_cents: number
  notes?: string
}

export const ordersService = {
  list: (params: OrdersParams = {}) =>
    api.get<OrdersResponse>('/admin/orders', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Order>(`/admin/orders/${id}`).then((r) => r.data),

  update: (id: number, data: OrderUpdateData) =>
    api.put<Order>(`/admin/orders/${id}`, { order: data }).then((r) => r.data),

  create: (data: ManualOrderPayload) =>
    api.post<Order>('/admin/orders', { manual_order: data }).then((r) => r.data),

  resendEmail: (id: number) =>
    api.post(`/admin/orders/${id}/resend_email`).then((r) => r.data),

  // Consulta quantos pedidos já existem para o CPF/CNPJ informado. Usado pelo
  // form manual para sinalizar cliente recorrente (lookup com debounce 400ms).
  lookupByTaxId: (taxId: string) =>
    api
      .get<{ orders_count: number; first_order_at: string | null }>(
        '/admin/orders/lookup_by_tax_id',
        { params: { tax_id: taxId } }
      )
      .then((r) => r.data),
}
