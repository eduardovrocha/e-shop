import api from './api'
import type { Customer, CustomersResponse } from '@/types/customer'

export interface CustomersParams {
  page?: number
  per_page?: number
  search?: string
}

export const customersService = {
  list: (params: CustomersParams = {}) =>
    api.get<CustomersResponse>('/admin/customers', { params }).then((r) => r.data),
  get: (id: number) =>
    api.get<Customer>(`/admin/customers/${id}`).then((r) => r.data),
}
