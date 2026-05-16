import api from './api'

export interface ProductionMetrics {
  period_days: number
  product_id: number | null
  avg_queue_time_hours: number
  avg_production_time_hours: number
  throughput_per_week: number
  cancellation_rate: number
  in_queue_now: number
  in_production_now: number
  samples: {
    queue_time: number
    production_time: number
    throughput: number
    cancellation: number
  }
}

export interface ProductionMetricsParams {
  period_days?: 7 | 30 | 90
  product_id?: number
}

export const productionMetricsService = {
  get: (params: ProductionMetricsParams = {}) =>
    api.get<ProductionMetrics>('/admin/production/metrics', { params }).then((r) => r.data),
}
