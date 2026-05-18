import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TourProgressIndicator } from '../TourProgressIndicator'

describe('TourProgressIndicator', () => {
  it('renders "Passo X de Y · Fase N" text', () => {
    render(<TourProgressIndicator stepIndex={0} totalSteps={10} phase={1} />)
    expect(screen.getByText('Passo 1 de 10 · Fase 1')).toBeInTheDocument()
  })

  it('renders one dot per step', () => {
    render(<TourProgressIndicator stepIndex={2} totalSteps={6} phase={2} />)
    expect(screen.getAllByTestId('tour-progress-dot')).toHaveLength(6)
  })

  it('fills dots up to the current step (inclusive)', () => {
    render(<TourProgressIndicator stepIndex={2} totalSteps={5} phase={1} />)
    const dots = screen.getAllByTestId('tour-progress-dot')
    expect(dots[0].dataset.filled).toBe('true')
    expect(dots[1].dataset.filled).toBe('true')
    expect(dots[2].dataset.filled).toBe('true')
    expect(dots[3].dataset.filled).toBe('false')
    expect(dots[4].dataset.filled).toBe('false')
  })

  it('exposes progressbar a11y attributes', () => {
    render(<TourProgressIndicator stepIndex={4} totalSteps={10} phase={1} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin',  '1')
    expect(bar).toHaveAttribute('aria-valuemax',  '10')
    expect(bar).toHaveAttribute('aria-valuenow',  '5')
  })

  it('clamps stepIndex into the [0, totalSteps - 1] range', () => {
    render(<TourProgressIndicator stepIndex={99} totalSteps={3} phase={1} />)
    expect(screen.getByText('Passo 3 de 3 · Fase 1')).toBeInTheDocument()
  })
})
