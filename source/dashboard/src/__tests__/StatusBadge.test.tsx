import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from '@/components/StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['pending', 'Pendente'],
    ['paid', 'Pago'],
    ['shipped', 'Enviado'],
    ['delivered', 'Entregue'],
    ['cancelled', 'Cancelado'],
    ['failed', 'Falhou'],
    ['active', 'Ativo'],
    ['inactive', 'Inativo'],
  ])('renders correct label for status "%s"', (status, expectedLabel) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('falls back to the raw status value for unknown statuses', () => {
    render(<StatusBadge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })
})
