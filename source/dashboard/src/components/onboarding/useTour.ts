import { useContext } from 'react'
import { TourContext } from './TourProvider'

/**
 * Hook to access the onboarding tour state and controls. Components that
 * call this must be rendered inside `<TourProvider>`.
 */
export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) {
    throw new Error('useTour must be used within a <TourProvider>')
  }
  return ctx
}
