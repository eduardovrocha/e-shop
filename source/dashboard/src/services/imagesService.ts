import api from './api'
import type { ProductImage } from '@/types/product'

interface ImagesResponse {
  images: ProductImage[]
  warnings?: string[]
}

export const imagesService = {
  upload: (productId: number, files: File[], onProgress?: (pct: number) => void) => {
    const form = new FormData()
    files.forEach((f) => form.append('images[]', f))
    return api
      .post<ImagesResponse>(`/admin/products/${productId}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
        },
      })
      .then((r) => r.data)
  },

  destroy: (productId: number, imageId: number) =>
    api
      .delete<ImagesResponse>(`/admin/products/${productId}/images/${imageId}`)
      .then((r) => r.data),

  reorder: (productId: number, order: number[]) =>
    api
      .patch<ImagesResponse>(`/admin/products/${productId}/images/reorder`, { order })
      .then((r) => r.data),

  setPrimary: (productId: number, imageId: number) =>
    api
      .patch<ImagesResponse>(`/admin/products/${productId}/images/${imageId}/primary`)
      .then((r) => r.data),
}
