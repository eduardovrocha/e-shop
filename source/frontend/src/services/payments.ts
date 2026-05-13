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
}

export interface PaymentIntentResponse {
  client_secret: string
  total_cents: number
  items_total_cents: number
  shipping_fee_cents: number
}

export async function createPaymentIntent(payload: CreateIntentPayload): Promise<PaymentIntentResponse> {
  const { data } = await api.post<PaymentIntentResponse>('/payments/create_intent', payload)
  return data
}
