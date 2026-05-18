import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TourModal } from '../TourModal'

function renderModal(overrides: Partial<React.ComponentProps<typeof TourModal>> = {}) {
  const primary   = vi.fn()
  const secondary = vi.fn()
  const dismiss   = vi.fn()

  const utils = render(
    <TourModal
      open
      title="Bem-vindo à sua loja."
      body={<p>Em uns 10 minutos a gente passa pelas áreas principais.</p>}
      primaryAction={{ label: 'Começar tour →', onClick: primary }}
      secondaryAction={{ label: 'Pular por agora', onClick: secondary }}
      onDismiss={dismiss}
      {...overrides}
    />
  )
  return { ...utils, primary, secondary, dismiss }
}

describe('TourModal', () => {
  it('renders title and body when open', () => {
    renderModal()
    expect(screen.getByText('Bem-vindo à sua loja.')).toBeInTheDocument()
    expect(screen.getByText(/Em uns 10 minutos/)).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    renderModal({ open: false })
    expect(screen.queryByText('Bem-vindo à sua loja.')).not.toBeInTheDocument()
  })

  it('renders primary action with label and forwards clicks', async () => {
    const user = userEvent.setup()
    const { primary } = renderModal()
    await user.click(screen.getByTestId('tour-modal-primary'))
    expect(primary).toHaveBeenCalledTimes(1)
  })

  it('renders secondary action with label and forwards clicks', async () => {
    const user = userEvent.setup()
    const { secondary } = renderModal()
    await user.click(screen.getByTestId('tour-modal-secondary'))
    expect(secondary).toHaveBeenCalledTimes(1)
  })

  it('omits the secondary action when not provided', () => {
    renderModal({ secondaryAction: undefined })
    expect(screen.queryByTestId('tour-modal-secondary')).not.toBeInTheDocument()
  })

  it('calls onDismiss when Esc is pressed', () => {
    const { dismiss } = renderModal()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(dismiss).toHaveBeenCalled()
  })

  it('exposes role="dialog" with aria-labelledby and aria-describedby (Radix Dialog)', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(dialog).toHaveAttribute('aria-describedby')
  })
})
