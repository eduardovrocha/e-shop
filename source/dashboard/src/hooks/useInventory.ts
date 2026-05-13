import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'

export function useInventory(params: { page?: number; per_page?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => inventoryService.list(params),
  })
}

export function useUpdateInventoryStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      stockQuantity,
    }: {
      productId: number
      variantId: number
      stockQuantity: number
    }) => inventoryService.updateVariantStock(productId, variantId, stockQuantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
