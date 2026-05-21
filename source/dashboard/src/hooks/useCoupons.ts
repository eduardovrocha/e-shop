import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { couponsService } from '@/services/couponsService'
import type {
  CodeType,
  CouponStatus,
  CouponWritePayload,
} from '@/types/coupon'

const LIST_KEY   = ['coupons']
const DETAIL_KEY = (id: number) => ['coupons', id]
const USAGE_KEY  = (id: number) => ['coupons', id, 'usages']

interface ListFilters {
  status?: CouponStatus
  code_type?: CodeType
}

export function useCoupons(filters: ListFilters = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn:  () => couponsService.list(filters),
    staleTime: 30_000,
  })
}

export function useCoupon(id: number | undefined) {
  return useQuery({
    queryKey: DETAIL_KEY(id ?? 0),
    queryFn:  () => couponsService.get(id as number),
    enabled:  Boolean(id),
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CouponWritePayload) => couponsService.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useUpdateCoupon(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CouponWritePayload) => couponsService.update(id, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: DETAIL_KEY(id) })
    },
  })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => couponsService.destroy(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useGenerateCodes(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (quantity: number) => couponsService.generateCodes(id, quantity),
    onSuccess:  () => qc.invalidateQueries({ queryKey: DETAIL_KEY(id) }),
  })
}

export function useCouponUsages(
  id: number,
  page: number,
  filters: { email?: string; since?: string; until?: string } = {},
) {
  return useQuery({
    queryKey: [...USAGE_KEY(id), page, filters],
    queryFn:  () => couponsService.usages(id, page, filters),
    enabled:  Boolean(id),
    staleTime: 30_000,
  })
}
