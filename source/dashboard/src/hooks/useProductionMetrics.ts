import { useQuery } from '@tanstack/react-query'
import { productionMetricsService, type ProductionMetricsParams } from '@/services/productionMetricsService'

export function useProductionMetrics(params: ProductionMetricsParams) {
  return useQuery({
    queryKey: ['production-metrics', params],
    queryFn: () => productionMetricsService.get(params),
  })
}
