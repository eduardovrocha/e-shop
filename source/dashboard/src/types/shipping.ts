export interface ShippingSettings {
  origin_zipcode: string
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_number: string
  sender_city: string
  sender_state: string
  me_client_id: string
  me_client_secret_set: boolean
  me_access_token_set: boolean
  me_sandbox: boolean
  free_shipping_enabled: boolean
  free_shipping_above_cents: number
  local_pickup_enabled: boolean
  global_extra_days: number
  global_extra_margin_pct: number
  me_configured: boolean
}

export interface ShippingSettingsPayload {
  origin_zipcode?: string
  sender_name?: string
  sender_phone?: string
  sender_address?: string
  sender_number?: string
  sender_city?: string
  sender_state?: string
  me_client_id?: string
  me_client_secret?: string
  me_access_token?: string
  me_refresh_token?: string
  me_sandbox?: boolean
  free_shipping_enabled?: boolean
  free_shipping_above_cents?: number
  local_pickup_enabled?: boolean
  global_extra_days?: number
  global_extra_margin_pct?: number
}

export interface ShippingCarrier {
  id: number
  me_service_id: number
  name: string
  company: string
  display_name: string
  enabled: boolean
  extra_days: number
  extra_margin_pct: number
  min_value_cents: number
  max_value_cents: number | null
  free_above_cents: number | null
}

export interface ShippingCarrierPayload {
  enabled?: boolean
  extra_days?: number
  extra_margin_pct?: number
  min_value_cents?: number
  max_value_cents?: number | null
  free_above_cents?: number | null
}

export interface ShippingOption {
  provider: string
  service_id: number
  carrier: string
  service: string
  price_cents: number
  delivery_days: number
  currency: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
}
