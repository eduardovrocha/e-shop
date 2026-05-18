import { render, screen, waitFor } from '@testing-library/react'
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

vi.mock('@/services/productsService', () => ({
  productsService: { list: vi.fn().mockResolvedValue({ products: [] }) },
}))

vi.mock('@/services/ordersService', () => ({
  ordersService: { list: vi.fn().mockResolvedValue({ orders: [] }) },
}))

import { TourProvider } from '../TourProvider'
import { onboardingService } from '@/services/onboardingService'
import { ordersService } from '@/services/ordersService'
import { PHASE_2_STEPS } from '../steps/phase2'
import { __resetConditionsCache } from '../steps/conditions'

function renderTour(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[ initialEntry ]}>
      <TourProvider>
        <div data-testid="app-content">app</div>
      </TourProvider>
    </MemoryRouter>,
  )
}

const phase2ReadyProgress = {
  status:                   'phase_2_ready' as const,
  current_phase:            2 as const,
  current_step_id:          null,
  completed_steps:          [],
  skipped_steps:            [],
  started_at:               '2026-05-16T00:00:00Z',
  completed_at:             '2026-05-17T00:00:00Z',
  last_seen_at:             '2026-05-17T00:00:00Z',
  next_eligible_phase_2_at: null,
}

describe('Phase 2 — entry modal and auto-trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetConditionsCache()
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(phase2ReadyProgress)
    ;(onboardingService.start as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...phase2ReadyProgress, status: 'in_progress',
    })
    ;(onboardingService.skip as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...phase2ReadyProgress, status: 'skipped',
    })
    ;(onboardingService.completePhase as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...phase2ReadyProgress, status: 'completed',
    })
  })

  it('shows the phase 2 entry modal when status=phase_2_ready', async () => {
    renderTour()
    expect(await screen.findByText('Sua primeira venda chegou!')).toBeInTheDocument()
    expect(screen.getByText('Sim, mostrar →')).toBeInTheDocument()
    expect(screen.getByText('Agora não')).toBeInTheDocument()
  })

  it('clicking "Sim, mostrar →" calls backend.start (which flips phase_2_ready → in_progress)', async () => {
    const user = userEvent.setup()
    renderTour()
    await screen.findByText('Sua primeira venda chegou!')

    await user.click(screen.getByText('Sim, mostrar →'))
    await waitFor(() => expect(onboardingService.start).toHaveBeenCalled())
  })

  it('clicking "Agora não" closes the modal without touching the backend', async () => {
    const user = userEvent.setup()
    renderTour()
    await screen.findByText('Sua primeira venda chegou!')

    await user.click(screen.getByText('Agora não'))

    await waitFor(() =>
      expect(screen.queryByText('Sua primeira venda chegou!')).not.toBeInTheDocument()
    )
    expect(onboardingService.skip).not.toHaveBeenCalled()
    expect(onboardingService.update).not.toHaveBeenCalled()
  })

  it('fetches the latest paid order when entering Phase 2 (for dynamic /orders/:id)', async () => {
    ;(ordersService.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      orders: [{ id: 42 }],
    })
    renderTour()
    await screen.findByText('Sua primeira venda chegou!')
    await waitFor(() =>
      expect(ordersService.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }))
    )
  })
})

describe('Phase 2 — step list integrity', () => {
  it('exposes 7 entries (entry + 5 inner + completion)', () => {
    expect(PHASE_2_STEPS).toHaveLength(7)
    expect(PHASE_2_STEPS[0].id).toBe('phase_2_entry')
    expect(PHASE_2_STEPS[PHASE_2_STEPS.length - 1].id).toBe('phase_2_complete')
  })

  it('flags shipping_workflow as disabled (no /shipments page yet)', () => {
    const shipping = PHASE_2_STEPS.find((s) => s.id === 'shipping_workflow')!
    expect(shipping.enabled).toBe(false)
  })

  it('production_workflow is gated by a condition', () => {
    const production = PHASE_2_STEPS.find((s) => s.id === 'production_workflow')!
    expect(production.condition).toBeDefined()
  })

  it('order_detail step uses the dynamic /orders/:id route', () => {
    const detail = PHASE_2_STEPS.find((s) => s.id === 'order_detail')!
    expect(detail.route).toBe('/orders/:id')
  })

  it('all positioned phase 2 steps use English dashboard routes', () => {
    const routes = new Set(PHASE_2_STEPS.filter((s) => !s.asModal).map((s) => s.route))
    expect(routes).toContain('/orders/:id')
    expect(routes).toContain('/production')
    expect(routes).toContain('/inventory')
    expect(routes).toContain('/customers')
  })
})
