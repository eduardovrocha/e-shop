import { useEffect, useState } from 'react'
import { getStripeConfig, type StripeConfig } from '@/lib/stripe'

interface State {
  config: StripeConfig | null
  loading: boolean
  error: Error | null
}

const INITIAL: State = { config: null, loading: true, error: null }

// Tiny session-scoped hook around getStripeConfig — keeps the request out of
// every component using <Elements /> by sharing the cached promise.
export function useStripeConfig(): State {
  const [state, setState] = useState<State>(INITIAL)

  useEffect(() => {
    let cancelled = false
    getStripeConfig()
      .then((config) => {
        if (!cancelled) setState({ config, loading: false, error: null })
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ config: null, loading: false, error })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
