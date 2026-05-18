import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/onboardingService', () => ({
  onboardingService: {
    fetch:         vi.fn(),
    update:        vi.fn(),
    start:         vi.fn(),
    completePhase: vi.fn(),
    skip:          vi.fn(),
    reset:         vi.fn(),
  },
}))

import { TourProvider } from '../TourProvider'
import { useTour } from '../useTour'
import { onboardingService } from '@/services/onboardingService'

function Consumer() {
  const tour = useTour()
  return (
    <div>
      <span data-testid="status">{tour.status ?? 'null'}</span>
      <span data-testid="phase">{tour.currentPhase ?? 'null'}</span>
      <span data-testid="step">{tour.currentStepId ?? 'null'}</span>
      <span data-testid="loading">{String(tour.loading)}</span>
      <button onClick={() => tour.start()}>start</button>
      <button onClick={() => tour.next()}>next</button>
      <button onClick={() => tour.prev()}>prev</button>
      <button onClick={() => tour.skipTour({ permanently: true })}>skip-permanent</button>
      <button onClick={() => tour.skipTour({ permanently: false })}>skip-temp</button>
      <button onClick={() => tour.completePhase(1)}>complete-1</button>
    </div>
  )
}

function renderProvider({ disableBackendSync = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TourProvider disableBackendSync={disableBackendSync} disableAutoTrigger>
        <Consumer />
      </TourProvider>
    </MemoryRouter>,
  )
}

const defaultProgress = {
  status:                   'in_progress' as const,
  current_phase:            1 as const,
  current_step_id:          'welcome',
  completed_steps:          [],
  skipped_steps:            [],
  started_at:               '2026-05-17T00:00:00Z',
  completed_at:             null,
  last_seen_at:             '2026-05-17T00:01:00Z',
  next_eligible_phase_2_at: null,
}

describe('TourProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(defaultProgress)
    ;(onboardingService.start as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...defaultProgress, status: 'in_progress',
    })
    ;(onboardingService.skip as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...defaultProgress, status: 'skipped',
    })
    ;(onboardingService.completePhase as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...defaultProgress, status: 'completed',
    })
  })

  it('renders children', () => {
    renderProvider({ disableBackendSync: true })
    expect(screen.getByTestId('status')).toBeInTheDocument()
  })

  it('loads progress from the backend on mount and reflects it in the context', async () => {
    renderProvider()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('status').textContent).toBe('in_progress')
    expect(screen.getByTestId('phase').textContent).toBe('1')
  })

  it('skips the backend fetch when disableBackendSync is true', () => {
    renderProvider({ disableBackendSync: true })
    expect(onboardingService.fetch).not.toHaveBeenCalled()
  })

  it('falls back gracefully when fetch fails (status stays null, loading false)', async () => {
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('500'))
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('status').textContent).toBe('null')
  })

  it('skipTour(permanently=true) calls the backend with permanently=true', async () => {
    const user = userEvent.setup()
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    await user.click(screen.getByText('skip-permanent'))
    await waitFor(() => expect(onboardingService.skip).toHaveBeenCalledWith(true))
  })

  it('skipTour(permanently=false) calls the backend with permanently=false', async () => {
    const user = userEvent.setup()
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    await user.click(screen.getByText('skip-temp'))
    await waitFor(() => expect(onboardingService.skip).toHaveBeenCalledWith(false))
  })

  it('completePhase calls the backend with the right phase number', async () => {
    const user = userEvent.setup()
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    await user.click(screen.getByText('complete-1'))
    await waitFor(() => expect(onboardingService.completePhase).toHaveBeenCalledWith(1))
  })

  it('start() calls the backend start endpoint', async () => {
    const user = userEvent.setup()
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    await act(async () => { await user.click(screen.getByText('start')) })
    await waitFor(() => expect(onboardingService.start).toHaveBeenCalled())
  })
})

describe('useTour', () => {
  it('throws when used outside a TourProvider', () => {
    // Suppress React's expected error output
    const originalError = console.error
    console.error = vi.fn()

    function Bare() {
      useTour()
      return null
    }
    expect(() => render(<Bare />)).toThrow(/useTour must be used within a <TourProvider>/)

    console.error = originalError
  })
})
