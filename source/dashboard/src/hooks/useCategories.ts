import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesService } from '@/services/categoriesService'

export type { CategoryResponse } from '@/services/categoriesService'

const KEY = ['categories'] as const

export function useCategories() {
  return useQuery({ queryKey: KEY, queryFn: categoriesService.list })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => categoriesService.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      categoriesService.update(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => categoriesService.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: { id: number; position: number }[]) =>
      categoriesService.reorder(order),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
