import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SkipTourModal } from '../SkipTourModal'

function renderModal(open = true) {
  const onSkipNow         = vi.fn()
  const onSkipPermanently = vi.fn()
  const onContinue        = vi.fn()
  const utils = render(
    <SkipTourModal
      open={open}
      onSkipNow={onSkipNow}
      onSkipPermanently={onSkipPermanently}
      onContinue={onContinue}
    />,
  )
  return { ...utils, onSkipNow, onSkipPermanently, onContinue }
}

describe('SkipTourModal', () => {
  it('renders the three options', () => {
    renderModal()
    expect(screen.getByText('Pular o tour?')).toBeInTheDocument()
    expect(screen.getByTestId('skip-tour-now')).toHaveTextContent('Pular agora')
    expect(screen.getByTestId('skip-tour-permanent')).toHaveTextContent('Não mostrar mais')
    expect(screen.getByTestId('skip-tour-continue')).toHaveTextContent('Continuar tour')
  })

  it('does not render when open is false', () => {
    renderModal(false)
    expect(screen.queryByText('Pular o tour?')).not.toBeInTheDocument()
  })

  it('forwards onSkipNow', async () => {
    const user = userEvent.setup()
    const { onSkipNow } = renderModal()
    await user.click(screen.getByTestId('skip-tour-now'))
    expect(onSkipNow).toHaveBeenCalledTimes(1)
  })

  it('forwards onSkipPermanently', async () => {
    const user = userEvent.setup()
    const { onSkipPermanently } = renderModal()
    await user.click(screen.getByTestId('skip-tour-permanent'))
    expect(onSkipPermanently).toHaveBeenCalledTimes(1)
  })

  it('forwards onContinue', async () => {
    const user = userEvent.setup()
    const { onContinue } = renderModal()
    await user.click(screen.getByTestId('skip-tour-continue'))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
