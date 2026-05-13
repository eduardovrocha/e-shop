import { useState, useEffect } from 'react'
import type { Product } from '@/types/product'
import { productsService } from '@/services/productsService'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    productsService
      .list()
      .then((data) => { if (!cancelled) setProducts(data) })
      .catch(() => { if (!cancelled) setError('Falha ao carregar produtos') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { products, isLoading, error }
}

export function useProduct(id: number) {
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    setProduct(null)
    productsService
      .get(id)
      .then((data) => { if (!cancelled) setProduct(data) })
      .catch(() => { if (!cancelled) setError('Produto não encontrado') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { product, isLoading, error }
}
