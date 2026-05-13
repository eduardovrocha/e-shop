import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderNotification {
  id: number
  number: string
  customer: string
  items: number
  total: number
  status: string
  createdAt: string
  isRead: boolean
  receivedAt: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'andrequice-notifications'
const MAX_ORDERS   = 50
const CHANNEL_ID   = JSON.stringify({ channel: 'OrdersChannel' })
const BACKOFF_MAX  = 30_000

// ── Storage helpers ───────────────────────────────────────────────────────────

function load(): OrderNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(orders: OrderNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_ORDERS)))
  } catch { /* storage full — ignore */ }
}

// ── WebSocket URL ─────────────────────────────────────────────────────────────

function cableUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/cable`
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOrderNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [orders, setOrders]           = useState<OrderNotification[]>(load)
  const [connectionStatus, setStatus] = useState<ConnectionStatus>('disconnected')

  const wsRef       = useRef<WebSocket | null>(null)
  const retryRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef  = useRef(0)
  const unmountedRef = useRef(false)

  // ── Subscribe to channel after welcome ──────────────────────────────────────

  function subscribe(ws: WebSocket) {
    ws.send(JSON.stringify({ command: 'subscribe', identifier: CHANNEL_ID }))
  }

  // ── Handle incoming message ──────────────────────────────────────────────────

  function handleMessage(ws: WebSocket, raw: string) {
    let msg: Record<string, unknown>
    try { msg = JSON.parse(raw) } catch { return }

    switch (msg.type) {
      case 'welcome':
        subscribe(ws)
        break
      case 'confirm_subscription':
        if (!unmountedRef.current) setStatus('connected')
        attemptRef.current = 0
        break
      case 'ping':
        break
      default: {
        // Broadcast message from server
        if (msg.identifier === CHANNEL_ID && msg.message) {
          const { type, payload } = msg.message as { type: string; payload: Record<string, unknown> }
          if (type === 'new_order') {
            const notification: OrderNotification = {
              id:         payload.id as number,
              number:     (payload.number as string) ?? `#${payload.id}`,
              customer:   (payload.customer as string) ?? 'Cliente',
              items:      (payload.items as number) ?? 0,
              total:      (payload.total as number) ?? 0,
              status:     (payload.status as string) ?? 'paid',
              createdAt:  (payload.created_at as string) ?? new Date().toISOString(),
              isRead:     false,
              receivedAt: new Date().toISOString(),
            }
            setOrders((prev) => {
              const updated = [notification, ...prev.filter((o) => o.id !== notification.id)].slice(0, MAX_ORDERS)
              save(updated)
              return updated
            })
          }
        }
      }
    }
  }

  // ── Connect ──────────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (unmountedRef.current || !isAuthenticated) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')

    const ws = new WebSocket(cableUrl())
    wsRef.current = ws

    ws.onopen = () => {
      // Welcome message from server triggers subscribe
    }

    ws.onmessage = (e) => handleMessage(ws, e.data as string)

    ws.onclose = () => {
      if (unmountedRef.current) return
      setStatus('disconnected')
      wsRef.current = null
      const delay = Math.min(1000 * 2 ** attemptRef.current, BACKOFF_MAX)
      attemptRef.current += 1
      retryRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      // onclose fires after onerror — reconnect is handled there
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    unmountedRef.current = false

    if (isAuthenticated) {
      connect()
    }

    return () => {
      unmountedRef.current = true
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [isAuthenticated, connect])

  // ── Public API ────────────────────────────────────────────────────────────────

  const unreadCount = orders.filter((o) => !o.isRead).length

  const markAsRead = useCallback((id: number) => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, isRead: true } : o))
      save(updated)
      return updated
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    setOrders((prev) => {
      const updated = prev.map((o) => ({ ...o, isRead: true }))
      save(updated)
      return updated
    })
  }, [])

  return { orders, unreadCount, markAsRead, markAllAsRead, connectionStatus }
}
