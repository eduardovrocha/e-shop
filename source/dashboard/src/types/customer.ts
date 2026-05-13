export interface CustomerAddress {
  id: number
  zipcode: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  country: string
  is_default: boolean
}

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  orders_count: number
  total_spent_cents: number
  last_order_at?: string
  created_at: string
  addresses?: CustomerAddress[]
  orders?: {
    id: number
    number: string
    status: string
    total_cents: number
    created_at: string
  }[]
}

export interface CustomersResponse {
  customers: Customer[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}
