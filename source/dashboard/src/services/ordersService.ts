import api from './api'
import type { Order, OrdersResponse } from '@/types/order'

export interface OrdersParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
}

export interface OrderUpdateData {
  status?: string
  tracking_code?: string
  notes?: string
  carrier?: string
  shipping_service?: string
  estimated_delivery?: string
}

export const ordersService = {
  list: (params: OrdersParams = {}) =>
    api.get<OrdersResponse>('/admin/orders', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Order>(`/admin/orders/${id}`).then((r) => r.data),

  update: (id: number, data: OrderUpdateData) =>
    api.put<Order>(`/admin/orders/${id}`, { order: data }).then((r) => r.data),

  resendEmail: (id: number) =>
    api.post(`/admin/orders/${id}/resend_email`).then((r) => r.data),
}
