import api from './api'

export interface StockCheckItem {
  variant_id: number
  quantity: number
}

export interface StockResult {
  variant_id: number
  available: number
  valid: boolean
  message: string | null
}

export async function checkStock(items: StockCheckItem[]): Promise<StockResult[]> {
  const { data } = await api.post<{ results: StockResult[] }>('/stock/check', { items })
  return data.results
}
