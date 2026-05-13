import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersService, type OrdersParams, type OrderUpdateData } from '@/services/ordersService'

export function useOrders(params: OrdersParams = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersService.list(params),
  })
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.get(id),
    enabled: id > 0,
  })
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrderUpdateData }) =>
      ordersService.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.setQueryData(['order', updated.id], updated)
    },
  })
}

export function useResendOrderEmail() {
  return useMutation({
    mutationFn: (id: number) => ordersService.resendEmail(id),
  })
}
