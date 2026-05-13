import api from '@/services/api'

export interface CategoryResponse {
  id: number
  name: string
  position: number
  products_count: number
}

export const categoriesService = {
  list: () =>
    api.get<CategoryResponse[]>('/admin/categories').then((r) => r.data),

  create: (name: string) =>
    api.post<CategoryResponse>('/admin/categories', { name }).then((r) => r.data),

  update: (id: number, name: string) =>
    api.put<CategoryResponse>(`/admin/categories/${id}`, { name }).then((r) => r.data),

  destroy: (id: number) =>
    api.delete(`/admin/categories/${id}`),

  reorder: (order: { id: number; position: number }[]) =>
    api.patch('/admin/categories/reorder', { order }),
}
