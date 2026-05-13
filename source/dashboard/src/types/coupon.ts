export type DiscountType = 'percentage' | 'fixed'

export interface Coupon {
  id: number
  code: string
  discount_type: DiscountType
  discount_value: number
  minimum_order_cents?: number
  expires_at?: string
  usage_limit?: number
  used_count: number
  active: boolean
  created_at: string
}

export interface CouponsResponse {
  coupons: Coupon[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}
