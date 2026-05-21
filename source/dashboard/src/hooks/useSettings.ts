import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService, type StoreSettings, type HeadlineSettings } from '@/services/settingsService'

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

export function useUpdateHeadline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HeadlineSettings) => settingsService.updateHeadline(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
