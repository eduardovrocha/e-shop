import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  stripeSettingsService,
  type StripeSettingsUpdatePayload,
  type StripeSwitchModePayload,
} from '@/services/stripeSettingsService'

const QUERY_KEY = ['stripe-admin-settings']

export function useStripeAdminSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: stripeSettingsService.get,
    staleTime: 30_000,
  })
}

export function useUpdateStripeSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: StripeSettingsUpdatePayload) =>
      stripeSettingsService.update(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useSwitchStripeMode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: StripeSwitchModePayload) =>
      stripeSettingsService.switchMode(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
