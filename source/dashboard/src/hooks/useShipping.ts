import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shippingService } from '@/services/shippingService'
import type { ShippingSettingsPayload, ShippingCarrierPayload } from '@/types/shipping'

export function useShippingSettings() {
  return useQuery({
    queryKey: ['shipping-settings'],
    queryFn: shippingService.getSettings,
    staleTime: 300_000,
  })
}

export function useUpdateShippingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ShippingSettingsPayload) => shippingService.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-settings'] }),
  })
}

export function useTestMelhorEnvioConnection() {
  return useMutation({
    mutationFn: (dims?: Parameters<typeof shippingService.testConnection>[0]) =>
      shippingService.testConnection(dims),
  })
}

export function useShippingCarriers() {
  return useQuery({
    queryKey: ['shipping-carriers'],
    queryFn: shippingService.listCarriers,
    staleTime: 300_000,
  })
}

export function useUpdateShippingCarrier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShippingCarrierPayload }) =>
      shippingService.updateCarrier(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-carriers'] }),
  })
}
