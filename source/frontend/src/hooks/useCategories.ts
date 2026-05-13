import { useMemo } from 'react'
import type { Product } from '@/types/product'
import { CATEGORIES, type CategoryMeta } from '@/config/categories'

export function useCategories(products: Product[]): CategoryMeta[] {
  return useMemo(() => {
    const slugsWithProducts = new Set(products.map((p) => p.category))
    return CATEGORIES.filter((c) => slugsWithProducts.has(c.slug))
  }, [products])
}
