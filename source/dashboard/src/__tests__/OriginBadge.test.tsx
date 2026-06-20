import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OriginBadge } from '@/components/OriginBadge'

describe('OriginBadge', () => {
  it('mostra "Manual" para pedidos manuais', () => {
    render(<OriginBadge source="manual" />)
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('mostra "Site" para pedidos do site', () => {
    render(<OriginBadge source="web" />)
    expect(screen.getByText('Site')).toBeInTheDocument()
  })

  it('trata origem ausente como Site', () => {
    render(<OriginBadge source={undefined} />)
    expect(screen.getByText('Site')).toBeInTheDocument()
  })
})
