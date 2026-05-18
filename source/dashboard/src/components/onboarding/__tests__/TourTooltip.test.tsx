import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TourTooltip } from '../TourTooltip'

function renderTooltip(overrides: Partial<React.ComponentProps<typeof TourTooltip>> = {}) {
  const onPrev = vi.fn()
  const onNext = vi.fn()
  const onSkip = vi.fn()

  const utils = render(
    <TourTooltip
      title="Comece pelo nome."
      body="É o que aparece para o cliente no checkout."
      stepIndex={0}
      totalSteps={5}
      phase={1}
      onPrev={onPrev}
      onNext={onNext}
      onSkip={onSkip}
      autoFocus={false}
      {...overrides}
    />
  )
  return { ...utils, onPrev, onNext, onSkip }
}

describe('TourTooltip', () => {
  it('renders title, body and progress indicator', () => {
    renderTooltip()
    expect(screen.getByText('Comece pelo nome.')).toBeInTheDocument()
    expect(screen.getByText(/É o que aparece para o cliente/)).toBeInTheDocument()
    expect(screen.getByText('Passo 1 de 5 · Fase 1')).toBeInTheDocument()
  })

  it('has role="dialog" with labelled title and described body', () => {
    renderTooltip()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(dialog).toHaveAttribute('aria-describedby')
  })

  it('hides "Voltar" on the first step', () => {
    renderTooltip({ isFirstStep: true })
    expect(screen.queryByTestId('tour-prev')).not.toBeInTheDocument()
  })

  it('shows "Voltar" on subsequent steps and forwards clicks', async () => {
    const user = userEvent.setup()
    const { onPrev } = renderTooltip({ isFirstStep: false, stepIndex: 2 })
    await user.click(screen.getByTestId('tour-prev'))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('renders "Concluir" label on the last step', () => {
    renderTooltip({ isLastStep: true, stepIndex: 4 })
    expect(screen.getByTestId('tour-next')).toHaveTextContent('Concluir')
  })

  it('renders "Próximo →" label on non-last steps', () => {
    renderTooltip()
    expect(screen.getByTestId('tour-next')).toHaveTextContent('Próximo')
  })

  it('forwards click on "Próximo"', async () => {
    const user = userEvent.setup()
    const { onNext } = renderTooltip()
    await user.click(screen.getByTestId('tour-next'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('forwards click on "Pular tour"', async () => {
    const user = userEvent.setup()
    const { onSkip } = renderTooltip()
    await user.click(screen.getByTestId('tour-skip'))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('triggers onSkip when Esc is pressed inside the tooltip', () => {
    const { onSkip } = renderTooltip()
    const tooltip = screen.getByTestId('tour-tooltip')
    fireEvent.keyDown(tooltip, { key: 'Escape' })
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it.each(['top', 'bottom', 'left', 'right'] as const)(
    'renders position="%s" via data-position attribute',
    (pos) => {
      renderTooltip({ position: pos })
      expect(screen.getByTestId('tour-tooltip')).toHaveAttribute('data-position', pos)
    }
  )
})
