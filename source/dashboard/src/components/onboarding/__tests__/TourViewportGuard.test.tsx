import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TourViewportGuard } from '../TourViewportGuard'

describe('TourViewportGuard', () => {
  it('renders the explanatory copy', () => {
    render(<TourViewportGuard onDismiss={() => {}} />)
    expect(screen.getByText(/O tour está disponível em telas maiores/)).toBeInTheDocument()
    expect(screen.getByText(/dashboard é otimizado para consulta/)).toBeInTheDocument()
  })

  it('calls onDismiss when the button is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<TourViewportGuard onDismiss={onDismiss} />)
    await user.click(screen.getByTestId('tour-viewport-guard-dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
