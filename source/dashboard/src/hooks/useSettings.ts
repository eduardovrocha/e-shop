import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService, type StoreSettings } from '@/services/settingsService'

export function useStripeInfo() {
  return useQuery({
    queryKey: ['stripe-info'],
    queryFn: settingsService.stripeInfo,
    staleTime: 60_000,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
    staleTime: 300_000,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StoreSettings>) => settingsService.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
