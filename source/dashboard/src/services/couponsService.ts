import api from './api'
import type {
  CodeType,
  CouponDetail,
  CouponStatus,
  CouponSummary,
  CouponUsagesResponse,
  CouponWritePayload,
  GenerateCodesResponse,
} from '@/types/coupon'

interface ListFilters {
  status?: CouponStatus
  code_type?: CodeType
}

export const couponsService = {
  list: (filters: ListFilters = {}) =>
    api
      .get<{ coupons: CouponSummary[] }>('/admin/coupons', { params: filters })
      .then((r) => r.data.coupons),

  get: (id: number) =>
    api.get<CouponDetail>(`/admin/coupons/${id}`).then((r) => r.data),

  create: (payload: CouponWritePayload) =>
    api.post<CouponDetail>('/admin/coupons', payload).then((r) => r.data),

  update: (id: number, payload: CouponWritePayload) =>
    api.patch<CouponDetail>(`/admin/coupons/${id}`, payload).then((r) => r.data),

  destroy: (id: number) =>
    api.delete<void>(`/admin/coupons/${id}`).then(() => undefined),

  generateCodes: (id: number, quantity: number) =>
    api
      .post<GenerateCodesResponse>(`/admin/coupons/${id}/generate_codes`, { quantity })
      .then((r) => r.data),

  usages: (
    id: number,
    page = 1,
    params: { email?: string; since?: string; until?: string } = {},
  ) =>
    api
      .get<CouponUsagesResponse>(`/admin/coupons/${id}/usages`, {
        params: { page, ...params },
      })
      .then((r) => r.data),
}
