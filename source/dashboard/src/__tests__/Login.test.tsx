import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from '@/pages/Login'

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ setAuth: vi.fn() }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import api from '@/services/api'

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('navigates to / on successful login', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { token: 'tok', user: { id: 1, email: 'a@b.com', role: 'admin' } },
    })

    renderLogin()
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'password')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('shows error on 401 response', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 401 } })

    renderLogin()
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() =>
      expect(screen.getByText(/e-mail ou senha incorretos/i)).toBeInTheDocument()
    )
  })

  it('shows lockout message after 5 failed attempts', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { status: 401 } })

    renderLogin()

    for (let i = 0; i < 5; i++) {
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
      await userEvent.type(screen.getByLabelText(/senha/i), 'wrong')
      await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(i + 1))
      await userEvent.clear(screen.getByLabelText(/e-mail/i))
      await userEvent.clear(screen.getByLabelText(/senha/i))
    }

    await waitFor(() =>
      expect(screen.getByText(/muitas tentativas falhas/i)).toBeInTheDocument()
    )
  })
})
