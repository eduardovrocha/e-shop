import api from './api'
import type {
  ShippingSettings,
  ShippingSettingsPayload,
  ShippingCarrier,
  ShippingCarrierPayload,
  ShippingOption,
  TestConnectionResult,
} from '@/types/shipping'

export const shippingService = {
  getSettings: () =>
    api.get<ShippingSettings>('/admin/shipping_settings').then((r) => r.data),

  updateSettings: (data: ShippingSettingsPayload) =>
    api
      .patch<ShippingSettings>('/admin/shipping_settings', { shipping_setting: data })
      .then((r) => r.data),

  testConnection: (dims?: {
    weight?: number
    height?: number
    width?: number
    length?: number
    insurance_value?: number
  }) =>
    api
      .post<TestConnectionResult>('/admin/shipping_settings/test_connection', dims ?? {})
      .then((r) => r.data),

  listCarriers: () =>
    api.get<ShippingCarrier[]>('/admin/shipping_carriers').then((r) => r.data),

  updateCarrier: (id: number, data: ShippingCarrierPayload) =>
    api
      .patch<ShippingCarrier>(`/admin/shipping_carriers/${id}`, { shipping_carrier: data })
      .then((r) => r.data),

  calculate: (zipcode: string, items: Array<{ productId: number; quantity: number }>) =>
    api
      .post<ShippingOption[]>('/shipping/calculate', { zipcode, items })
      .then((r) => r.data),
}
