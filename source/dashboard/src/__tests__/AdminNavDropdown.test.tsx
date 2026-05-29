import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AdminNavDropdown } from '@/components/AdminNavDropdown'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminNavDropdown />
    </MemoryRouter>
  )
}

describe('AdminNavDropdown', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  it('shows Dashboard label on root path', () => {
    renderAt('/')
    const trigger = screen.getByTestId('admin-nav-trigger')
    expect(trigger).toHaveTextContent('Dashboard')
  })

  it('reflects active section based on current route prefix', () => {
    renderAt('/orders/42')
    const trigger = screen.getByTestId('admin-nav-trigger')
    expect(trigger).toHaveTextContent('Pedidos')
  })

  it('matches deepest prefix when multiple could match', () => {
    renderAt('/production')
    const trigger = screen.getByTestId('admin-nav-trigger')
    expect(trigger).toHaveTextContent('Produção')
  })

  it('opens the panel, lists all sections, and navigates on selection', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await user.click(screen.getByTestId('admin-nav-trigger'))

    const menu = screen.getByRole('menu', { name: /navega/i })
    expect(menu).toBeInTheDocument()

    for (const label of [
      'Dashboard',
      'Pedidos',
      'Produção',
      'Produtos',
      'Estoque',
      'Clientes',
      'Cupons',
      'Frete',
      'Stripe',
      'Configurações',
    ]) {
      expect(screen.getByRole('menuitem', { name: new RegExp(label) })).toBeInTheDocument()
    }

    await user.click(screen.getByRole('menuitem', { name: /Produtos/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/products')
  })

  it('does not navigate when selecting the current route', async () => {
    const user = userEvent.setup()
    renderAt('/products')

    await user.click(screen.getByTestId('admin-nav-trigger'))
    await user.click(screen.getByRole('menuitem', { name: /Produtos/ }))

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
