import api from './api'
import type { VariantGender, VariantCut } from '@/types/product'

export interface VariantRow {
  id: number
  product: string
  product_id: number
  sku: string
  size: string
  color: string
  gender: VariantGender | null
  cut: VariantCut | null
  stock: number
  reserved: number
  available: number
}

export interface InventoryResponse {
  variants: VariantRow[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}

export const inventoryService = {
  list: (params: { page?: number; per_page?: number; search?: string } = {}) =>
    api.get<InventoryResponse>('/admin/products/inventory', { params }).then((r) => r.data),
  updateVariantStock: (productId: number, variantId: number, stockQuantity: number) =>
    api
      .patch(`/admin/products/${productId}/stock`, {
        variants: [{ id: variantId, stock_quantity: stockQuantity }],
      })
      .then((r) => r.data),
}
