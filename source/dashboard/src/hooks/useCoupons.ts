import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { couponsService, type CouponPayload } from '@/services/couponsService'

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: couponsService.list,
  })
}

export function useCoupon(id: number) {
  return useQuery({
    queryKey: ['coupons', id],
    queryFn: () => couponsService.get(id),
    enabled: id > 0,
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CouponPayload) => couponsService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  })
}

export function useUpdateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CouponPayload }) =>
      couponsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => couponsService.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  })
}
