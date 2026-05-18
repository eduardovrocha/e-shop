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

import { TourProvider } from '../TourProvider'
import { TourReplayButton } from '../TourReplayButton'
import { onboardingService } from '@/services/onboardingService'
import { PHASE_1_STEPS } from '../steps/phase1'

function renderTour() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TourProvider>
        <TourReplayButton />
        <div data-testid="app-content">app</div>
      </TourProvider>
    </MemoryRouter>,
  )
}

const baseProgress = {
  status:                   'not_started' as const,
  current_phase:            1 as const,
  current_step_id:          null,
  completed_steps:          [],
  skipped_steps:            [],
  started_at:               null,
  completed_at:             null,
  last_seen_at:             null,
  next_eligible_phase_2_at: null,
}

/**
 * Helper — drives the user through the only path that opens the tour:
 * click the replay button, then pick "Setup inicial" in the catalog.
 */
async function openPhase1ViaCatalog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId('tour-replay-button'))
  await user.click(await screen.findByTestId('tour-catalog-phase-1'))
  await screen.findByText('Bem-vindo à sua loja.')
}

describe('Phase 1 — manual replay through the catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(baseProgress)
    ;(onboardingService.reset as ReturnType<typeof vi.fn>).mockResolvedValue(baseProgress)
    ;(onboardingService.start as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'in_progress', started_at: '2026-05-17T00:00:00Z',
    })
    ;(onboardingService.skip as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'skipped',
    })
    ;(onboardingService.completePhase as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'completed',
    })
  })

  it('does NOT auto-open the welcome modal on mount when status=not_started', async () => {
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())
    expect(screen.queryByText('Bem-vindo à sua loja.')).not.toBeInTheDocument()
  })

  it('does NOT auto-open the welcome modal when status=in_progress (no resume on login)', async () => {
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'in_progress', current_step_id: 'welcome',
    })
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())
    expect(screen.queryByText('Bem-vindo à sua loja.')).not.toBeInTheDocument()
    expect(onboardingService.start).not.toHaveBeenCalled()
  })

  it('does NOT auto-open when status=completed or skipped', async () => {
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'completed', completed_at: '2026-05-17T00:00:00Z',
    })
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())
    expect(screen.queryByText('Bem-vindo à sua loja.')).not.toBeInTheDocument()
  })

  it('opening Setup via catalog shows the welcome modal', async () => {
    const user = userEvent.setup()
    renderTour()
    await openPhase1ViaCatalog(user)
    expect(screen.getByText('Começar tour →')).toBeInTheDocument()
    expect(screen.getByText('Pular por agora')).toBeInTheDocument()
  })

  it('clicking "Começar tour →" calls backend.start', async () => {
    const user = userEvent.setup()
    renderTour()
    await openPhase1ViaCatalog(user)

    await user.click(screen.getByText('Começar tour →'))
    await waitFor(() => expect(onboardingService.start).toHaveBeenCalled())
  })

  it('clicking "Pular por agora" opens the skip confirmation modal', async () => {
    const user = userEvent.setup()
    renderTour()
    await openPhase1ViaCatalog(user)

    await user.click(screen.getByText('Pular por agora'))
    expect(await screen.findByText('Pular o tour?')).toBeInTheDocument()
    expect(screen.getByTestId('skip-tour-now')).toBeInTheDocument()
    expect(screen.getByTestId('skip-tour-permanent')).toBeInTheDocument()
    expect(screen.getByTestId('skip-tour-continue')).toBeInTheDocument()
  })

  it('"Não mostrar mais" calls skip(permanently=true)', async () => {
    const user = userEvent.setup()
    renderTour()
    await openPhase1ViaCatalog(user)

    await user.click(screen.getByText('Pular por agora'))
    await user.click(screen.getByTestId('skip-tour-permanent'))
    await waitFor(() => expect(onboardingService.skip).toHaveBeenCalledWith(true))
  })

  it('"Pular agora" calls skip(permanently=false)', async () => {
    const user = userEvent.setup()
    renderTour()
    await openPhase1ViaCatalog(user)

    await user.click(screen.getByText('Pular por agora'))
    await user.click(screen.getByTestId('skip-tour-now'))
    await waitFor(() => expect(onboardingService.skip).toHaveBeenCalledWith(false))
  })

  it('"Continuar tour" closes the skip modal without calling backend.skip', async () => {
    const user = userEvent.setup()
    renderTour()
    await openPhase1ViaCatalog(user)

    await user.click(screen.getByText('Pular por agora'))
    await user.click(screen.getByTestId('skip-tour-continue'))

    await waitFor(() => expect(screen.queryByText('Pular o tour?')).not.toBeInTheDocument())
    expect(onboardingService.skip).not.toHaveBeenCalled()
  })
})

describe('Phase 1 — step list integrity', () => {
  it('exposes 11 steps total (welcome + 9 inner + phase_1_complete)', () => {
    expect(PHASE_1_STEPS).toHaveLength(11)
    expect(PHASE_1_STEPS[0].id).toBe('welcome')
    expect(PHASE_1_STEPS[PHASE_1_STEPS.length - 1].id).toBe('phase_1_complete')
  })

  it('flags inventory_link and content_intro as disabled until those features land', () => {
    const disabled = PHASE_1_STEPS.filter((s) => s.enabled === false).map((s) => s.id)
    expect(disabled).toEqual(expect.arrayContaining(['store_config_logo', 'inventory_link', 'content_intro']))
  })

  it('production_intro is gated by a condition (not unconditionally enabled)', () => {
    const production = PHASE_1_STEPS.find((s) => s.id === 'production_intro')!
    expect(production.condition).toBeDefined()
  })

  it('all positioned steps have a data-tour target selector', () => {
    const positioned = PHASE_1_STEPS.filter((s) => !s.asModal)
    for (const s of positioned) {
      expect(s.target).toMatch(/^\[data-tour="[a-z-]+"\]$/)
    }
  })

  it('uses dashboard real route paths (English)', () => {
    const routes = new Set(PHASE_1_STEPS.map((s) => s.route))
    expect(routes).toContain('/settings')
    expect(routes).toContain('/orders')
    expect(routes).toContain('/products')
    expect(routes).toContain('/shipping')
    expect(routes).toContain('/production')
  })
})
