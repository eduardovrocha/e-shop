import api from './api'

interface CartItemPayload {
  variant_id: number
  quantity: number
}

export interface CouponValidateResponse {
  valid: true
  discount_cents: number
  eligible_product_ids: number[]
  total_cart_products: number
  requires_email_validation?: boolean
}

export interface CouponValidationError {
  valid: false
  error: string
}

// Layer 1: structural validation. No email yet — the storefront uses this
// the moment the customer clicks "Aplicar". On success, the UI advances to
// the email step before fully committing.
export async function validateCoupon(
  code: string,
  items: CartItemPayload[],
): Promise<CouponValidateResponse> {
  const { data } = await api.post<CouponValidateResponse>('/coupons/validate', {
    code,
    items,
  })
  return data
}

// Layer 2: includes the per_customer_limit check. Called from the email
// mini-prompt that opens after Layer 1 succeeds.
export async function validateCouponWithEmail(
  code: string,
  email: string,
  items: CartItemPayload[],
): Promise<CouponValidateResponse> {
  const { data } = await api.post<CouponValidateResponse>(
    '/coupons/validate_with_email',
    { code, email, items },
  )
  return data
}
