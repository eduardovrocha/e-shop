import api from './api'
import type { Product, ProductsResponse, VariantPayload } from '@/types/product'

export interface ProductsParams {
  page?: number
  per_page?: number
  search?: string
}

export interface ProductPayload {
  name?: string
  description?: string
  price_cents?: number
  category?: string
  active?: boolean
  weight_g?: number | null
  height_mm?: number | null
  width_mm?: number | null
  length_mm?: number | null
  fulfillment_mode?: 'from_stock' | 'made_to_order'
  production_lead_time_days?: number | null
  production_capacity?: number | null
  cancellation_refund_percentage?: number | null
  variants_attributes?: VariantPayload[]
}

export interface StockUpdatePayload {
  variants: { id: number; stock_quantity: number }[]
}

export const productsService = {
  list: (params: ProductsParams = {}) =>
    api.get<ProductsResponse>('/admin/products', { params }).then((r) => r.data),
  get: (id: number) =>
    api.get<Product>(`/admin/products/${id}`).then((r) => r.data),
  create: (data: ProductPayload) =>
    api.post<Product>('/admin/products', { product: data }).then((r) => r.data),
  update: (id: number, data: ProductPayload) =>
    api.put<Product>(`/admin/products/${id}`, { product: data }).then((r) => r.data),
  destroy: (id: number) => api.delete(`/admin/products/${id}`),
  updateStock: (id: number, payload: StockUpdatePayload) =>
    api.patch<Product>(`/admin/products/${id}/stock`, payload).then((r) => r.data),
}
