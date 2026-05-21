// Type definitions match the backend Api::V1::Admin::CouponsController
// payloads. Legacy fields (discount_type, used_count, etc) were removed —
// only percentual coupons are supported in MVP.

export type CodeType  = 'public' | 'unique'
export type ScopeType = 'all_products' | 'specific_products'
export type CouponStatus = 'active' | 'inactive' | 'expired' | 'scheduled' | 'exhausted'

export interface CouponSummary {
  id: number
  name: string
  discount_percent: number
  code_type: CodeType
  public_code: string | null
  unique_codes_count: number | null
  scope_type: ScopeType
  scope_products_count: number | null
  starts_at: string | null
  expires_at: string | null
  total_usage_limit: number | null
  usages_count: number
  active: boolean
  status: CouponStatus
}

export interface CouponDetail extends CouponSummary {
  applies_to_sale_items: boolean
  per_customer_limit: number | null
  product_ids: number[]
  immutable_fields: string[]
}

export interface CouponWritePayload {
  name?: string
  discount_percent?: number
  applies_to_sale_items?: boolean
  code_type?: CodeType
  public_code?: string | null
  scope_type?: ScopeType
  starts_at?: string | null
  expires_at?: string | null
  total_usage_limit?: number | null
  per_customer_limit?: number | null
  active?: boolean
  product_ids?: number[]
}

export interface CouponUsageRow {
  id: number
  email: string
  order_id: number | null
  order_number: string | null
  code_used: string | null
  discount_amount_cents: number
  created_at: string
}

export interface CouponUsagesResponse {
  usages: CouponUsageRow[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface GenerateCodesResponse {
  generated: number
  codes: string[]
}
