import api from './api'
import type { Order } from '@/types/order'

export interface DashboardStats {
  revenue_cents: number
  paid_orders_count: number
  pending_orders_count: number
  average_ticket_cents: number
  weekly_sales: { day: string; vendas: number }[]
  top_products: { name: string; size: string; qty: number }[]
  low_stock_count: number
  awaiting_shipment_count: number
  recent_orders: Pick<Order, 'id' | 'number' | 'customer_name' | 'status' | 'total_cents' | 'created_at'>[]
}

export const dashboardService = {
  stats: () => api.get<DashboardStats>('/admin/dashboard/stats').then((r) => r.data),
}
