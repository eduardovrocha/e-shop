import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { releaseService } from '@/services/releaseService'

const QUERY_KEY = ['release-status']

export function useReleaseStatus() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: releaseService.get,
    staleTime: 0,
  })
}

export function useWipeRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (phrase: string) => releaseService.wipe(phrase),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
