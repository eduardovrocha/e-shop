import { useQuery } from '@tanstack/react-query'
import { customersService, type CustomersParams } from '@/services/customersService'

export function useCustomers(params: CustomersParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersService.list(params),
  })
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersService.get(id!),
    enabled: id != null,
  })
}
