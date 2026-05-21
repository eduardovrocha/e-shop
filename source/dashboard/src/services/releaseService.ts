import api from './api'

export interface ReleaseLastExecution {
  executed_at: string
  admin_email: string | null
  ip_address: string | null
  orders_deleted: number
  order_items_deleted: number
  customers_deleted: number
}

export interface ReleaseStatus {
  already_executed: boolean
  rewipe_allowed: boolean
  last_execution: ReleaseLastExecution | null
}

export interface ReleaseWipeResponse {
  ok: true
  counts: Record<string, number>
  executed_at: string
}

export const releaseService = {
  get: () => api.get<ReleaseStatus>('/admin/release').then((r) => r.data),

  wipe: (confirmationPhrase: string) =>
    api
      .post<ReleaseWipeResponse>('/admin/release/wipe', {
        confirmation_phrase: confirmationPhrase,
      })
      .then((r) => r.data),
}
