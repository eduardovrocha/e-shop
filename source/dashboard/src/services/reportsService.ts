import api from './api'

export const reportsService = {
  // Baixa o PDF de pedidos. status omitido ou 'all' => relatório agrupado.
  ordersPdf: (status?: string) =>
    api.get('/admin/reports/orders.pdf', {
      params: status && status !== 'all' ? { status } : undefined,
      responseType: 'blob',
    }),
}
