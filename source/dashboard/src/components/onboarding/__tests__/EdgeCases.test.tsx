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
import { TourTooltip } from '../TourTooltip'
import { TourReplayButton } from '../TourReplayButton'
import { onboardingService } from '@/services/onboardingService'
import { PHASE_1_STEPS } from '../steps/phase1'
import { PHASE_2_STEPS } from '../steps/phase2'

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

function renderTour(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <TourProvider>
        <TourReplayButton />
        <div data-testid="app-content">app</div>
      </TourProvider>
    </MemoryRouter>,
  )
}

describe('EC1 — "Próximo" never blocks the user', () => {
  it('renders the Próximo button as enabled regardless of step state', () => {
    render(
      <TourTooltip
        title="t" body="b" stepIndex={0} totalSteps={5} phase={1}
        onPrev={() => {}} onNext={() => {}} onSkip={() => {}}
        autoFocus={false}
      />,
    )
    const nextBtn = screen.getByTestId('tour-next')
    expect(nextBtn).not.toBeDisabled()
    expect(nextBtn).not.toHaveAttribute('aria-disabled', 'true')
  })
})

describe('EC3 — tooltip pauses silently when the user navigates off-tour', () => {
  it('does not render Joyride when current route is unknown to the tour', async () => {
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'in_progress', current_step_id: 'store_config_name',
    })
    // Route is intentionally not in any step's route definition
    renderTour('/random-page-the-tour-doesnt-know')
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())

    // Welcome modal does not auto-show for in_progress without a target match,
    // and the Joyride DOM portal should not render the spotlight wrapper.
    expect(screen.queryByText('Bem-vindo à sua loja.')).not.toBeInTheDocument()
  })
})

describe('EC6 — backend offline does not break the dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ECONNREFUSED'))
  })

  it('renders children even when /progress fails', async () => {
    renderTour()
    await waitFor(() =>
      expect(onboardingService.fetch).toHaveBeenCalled()
    )
    expect(screen.getByTestId('app-content')).toBeInTheDocument()
  })

  it('does not show the welcome modal when status cannot be determined', async () => {
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())
    expect(screen.queryByText('Bem-vindo à sua loja.')).not.toBeInTheDocument()
  })
})

describe('EC8 — step ids are stable across versions', () => {
  it('phase 1 step ids never change (used as backend persistence keys)', () => {
    expect(PHASE_1_STEPS.map((s) => s.id)).toEqual([
      'welcome',
      'store_config_name',
      'store_config_logo',
      'store_config_contact',
      'shipping_config',
      'products_create_first',
      'inventory_link',
      'production_intro',
      'content_intro',
      'sales_orders_overview',
      'phase_1_complete',
    ])
  })

  it('phase 2 step ids never change', () => {
    expect(PHASE_2_STEPS.map((s) => s.id)).toEqual([
      'phase_2_entry',
      'order_detail',
      'production_workflow',
      'shipping_workflow',
      'inventory_after_sale',
      'customers_intro',
      'phase_2_complete',
    ])
  })

  it('ids match the snake_case identifier shape used by the backend', () => {
    const idRe = /^[a-z][a-z0-9_]+$/
    for (const s of [ ...PHASE_1_STEPS, ...PHASE_2_STEPS ]) {
      expect(s.id).toMatch(idRe)
    }
  })
})

describe('Replay tour — "Refazer tour" opens a catalog with selectable phases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(onboardingService.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'completed',
    })
    ;(onboardingService.reset as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'not_started',
    })
    ;(onboardingService.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProgress, status: 'phase_2_ready', current_phase: 2,
    })
  })

  it('is rendered inside the dashboard chrome and accessible', async () => {
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())
    expect(screen.getByTestId('tour-replay-button')).toHaveAccessibleName('Refazer tour')
  })

  it('clicking the button opens the catalog modal with both phases listed', async () => {
    const user = userEvent.setup()
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())

    await user.click(screen.getByTestId('tour-replay-button'))

    expect(await screen.findByTestId('tour-catalog-modal')).toBeInTheDocument()
    expect(screen.getByTestId('tour-catalog-phase-1')).toHaveTextContent('Setup inicial')
    expect(screen.getByTestId('tour-catalog-phase-2')).toHaveTextContent('Operação')
    expect(onboardingService.reset).not.toHaveBeenCalled()
  })

  it('picking "Setup inicial" calls onboardingService.reset and reopens the welcome modal', async () => {
    const user = userEvent.setup()
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())

    await user.click(screen.getByTestId('tour-replay-button'))
    await user.click(await screen.findByTestId('tour-catalog-phase-1'))

    await waitFor(() => expect(onboardingService.reset).toHaveBeenCalled())
    expect(await screen.findByText('Bem-vindo à sua loja.')).toBeInTheDocument()
  })

  it('picking "Operação" flips status to phase_2_ready and shows the phase 2 entry modal', async () => {
    const user = userEvent.setup()
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())

    await user.click(screen.getByTestId('tour-replay-button'))
    await user.click(await screen.findByTestId('tour-catalog-phase-2'))

    await waitFor(() =>
      expect(onboardingService.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'phase_2_ready' }))
    )
    expect(await screen.findByText('Sua primeira venda chegou!')).toBeInTheDocument()
  })

  it('"Cancelar" closes the catalog without touching the backend', async () => {
    const user = userEvent.setup()
    renderTour()
    await waitFor(() => expect(onboardingService.fetch).toHaveBeenCalled())

    await user.click(screen.getByTestId('tour-replay-button'))
    await user.click(await screen.findByTestId('tour-catalog-cancel'))

    await waitFor(() => expect(screen.queryByTestId('tour-catalog-modal')).not.toBeInTheDocument())
    expect(onboardingService.reset).not.toHaveBeenCalled()
    expect(onboardingService.update).not.toHaveBeenCalled()
  })
})
