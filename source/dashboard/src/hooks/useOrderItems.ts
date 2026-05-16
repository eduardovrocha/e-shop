import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderItemsService, type OrderItemsListParams } from '@/services/orderItemsService'

export function useOrderItems(params: OrderItemsListParams, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['orderItems', params],
    queryFn: () => orderItemsService.list(params),
    refetchInterval: options?.refetchInterval ?? false,
  })
}

export function useStartProduction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => orderItemsService.startProduction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orderItems'] }),
  })
}

export function useCompleteProduction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => orderItemsService.completeProduction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orderItems'] }),
  })
}

export function useCancelOrderItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      orderItemsService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orderItems'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order'] })
    },
  })
}
