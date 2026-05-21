import api from './api'

interface CartItemPayload {
  id: number
  quantity: number
}

interface ShippingAddress {
  cep: string
  address: string
  number: string
  complement: string
  city: string
  state: string
}

export interface CreateIntentPayload {
  items: CartItemPayload[]
  delivery_method: 'delivery' | 'pickup'
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: ShippingAddress | null
  shipping_cep?: string
  shipping_service_id?: number
  // Buyer-entered coupon code (public_code or unique code). Backend
  // re-validates and reserves a slot under lock — never trusts a
  // client-computed discount.
  coupon_code?: string
}

export interface PaymentIntentResponse {
  client_secret: string
  total_cents: number
  items_total_cents: number
  shipping_fee_cents: number
  // Authoritative discount the backend applied. Mirrored on the order
  // confirmation page so the UI matches the actual charge.
  discount_amount_cents?: number | null
  aggregated_promised_completion_date?: string | null
}

export async function createPaymentIntent(payload: CreateIntentPayload): Promise<PaymentIntentResponse> {
  const { data } = await api.post<PaymentIntentResponse>('/payments/create_intent', payload)
  return data
}
