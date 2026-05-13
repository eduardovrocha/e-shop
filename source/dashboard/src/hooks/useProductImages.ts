import { useMutation, useQueryClient } from '@tanstack/react-query'
import { imagesService } from '@/services/imagesService'
import { useState } from 'react'

export function useUploadImages(productId: number) {
  const qc = useQueryClient()
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: (files: File[]) => imagesService.upload(productId, files, setProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setProgress(0)
    },
    onError: () => setProgress(0),
  })

  return { ...mutation, progress }
}

export function useDeleteImage(productId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (imageId: number) => imagesService.destroy(productId, imageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useReorderImages(productId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: number[]) => imagesService.reorder(productId, order),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useSetPrimaryImage(productId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (imageId: number) => imagesService.setPrimary(productId, imageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
