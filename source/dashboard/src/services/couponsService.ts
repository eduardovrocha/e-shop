import api from './api'
import type { Coupon, CouponsResponse } from '@/types/coupon'

export interface CouponPayload {
  code?: string
  discount_type?: 'percentage' | 'fixed'
  discount_value?: number
  minimum_order_cents?: number
  expires_at?: string
  usage_limit?: number
  active?: boolean
}

export const couponsService = {
  list: () => api.get<CouponsResponse>('/admin/coupons').then((r) => r.data),
  get: (id: number) => api.get<Coupon>(`/admin/coupons/${id}`).then((r) => r.data),
  create: (data: CouponPayload) =>
    api.post<Coupon>('/admin/coupons', { coupon: data }).then((r) => r.data),
  update: (id: number, data: CouponPayload) =>
    api.put<Coupon>(`/admin/coupons/${id}`, { coupon: data }).then((r) => r.data),
  destroy: (id: number) => api.delete(`/admin/coupons/${id}`),
}
