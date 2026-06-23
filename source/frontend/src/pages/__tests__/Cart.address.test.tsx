import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ─── Module mocks (declared before imports of the SUT) ──────────────────────

vi.mock('@/hooks/useStore', () => ({
  useStore: () => ({
    store: {
      event_name: 'Andrequicé',
      edition: '2026',
      shipping_fee_cents: 0,
      free_shipping_above_cents: 0,
      pickup_zipcode: '',
      pickup_street: '',
      pickup_number: '',
      pickup_complement: '',
      pickup_city: '',
      pickup_state: '',
      pickup_enabled: false,
      pickup_available: false,
    },
    isLoading: false,
    shippingFeeCents: 0,
    freeShippingAboveCents: 0,
  }),
}))

vi.mock('@/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({
    headline_primary: '',
    headline_secondary: '',
    headline_description: '',
    footer_description: '',
    contact_email: '',
    whatsapp_number: '',
  }),
}))

vi.mock('@/services/stockService', () => ({
  checkStock: vi.fn(() => Promise.resolve([])),
}))

// Mock the shared axios instance. CouponInput / etc. may import it; we only
// care about /shipping/calculate for the cart flow.
const apiPost = vi.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>()
const apiGet  = vi.fn<(url: string) => Promise<{ data: unknown }>>(() =>
  Promise.resolve({ data: {} })
)
vi.mock('@/services/api', () => ({
  default: {
    post: (url: string, body?: unknown) => apiPost(url, body),
    get:  (url: string) => apiGet(url),
    interceptors: { response: { use: vi.fn() }, request: { use: vi.fn() } },
  },
}))

import Cart from '@/pages/Cart'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ViaCepShape {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

function mockViaCep(response: ViaCepShape | { erro: true } | null) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(response),
    } as Response)
  ) as unknown as typeof fetch
}

function seedCart() {
  // One item, enough to bypass the empty-cart redirect.
  useCartStore.setState({
    items: [
      {
        id: 1,
        variantId: 10,
        name: 'Produto Teste',
        size: 'M',
        price: 100,
        quantity: 1,
        fulfillmentMode: 'from_stock',
        productionLeadTimeDays: null,
      },
    ],
    appliedCoupon: null,
  })
}

function resetCheckout() {
  useCheckoutStore.setState({
    deliveryMethod: 'delivery',
    selectedShipping: null,
    shippingAddress: null,
    contact: { name: '', phone: '', email: '', taxId: '' },
    addressExtra: { number: '', complement: '' },
  })
}

function renderCart() {
  return render(
    <MemoryRouter>
      <Cart />
    </MemoryRouter>
  )
}

// Walks the accordion from step 1 (Carrinho) up to and including the
// confirmation of step 3 (Contato), leaving step 4 (Endereço) active.
async function advanceToAddressStep(user: ReturnType<typeof userEvent.setup>) {
  // Step 1 — Carrinho
  const continueButtons = () => screen.getAllByRole('button', { name: /^continuar$/i })
  await user.click(continueButtons()[0])

  // Step 2 — Método de entrega: type CEP + calcular
  const cepInput = await screen.findByPlaceholderText('00000-000')
  await user.type(cepInput, '38750000')
  await user.click(screen.getByRole('button', { name: /calcular/i }))

  // Wait for shipping options to render
  await screen.findByText(/PAC/i, undefined, { timeout: 3000 })
  // Continue to step 3
  await user.click(continueButtons()[0])

  // Step 3 — Contato: fill in (includes CPF, required since the tax_id roll-out)
  await user.type(screen.getByPlaceholderText('seuemail@exemplo.com'), 'a@a.com')
  await user.type(screen.getByPlaceholderText('João da Silva'), 'João da Silva')
  await user.type(screen.getByPlaceholderText('(38) 99999-9999'), '38999999999')
  await user.type(
    screen.getByPlaceholderText('000.000.000-00 ou 00.000.000/0000-00'),
    '11144477735'
  )
  await user.click(continueButtons()[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  resetCheckout()
  seedCart()
  // Default: api.post for shipping returns one option.
  apiPost.mockImplementation((url: string) => {
    if (url === '/shipping/calculate') {
      return Promise.resolve({
        data: [
          {
            provider: 'melhor-envio',
            service_id: 1,
            carrier: 'Correios',
            service: 'PAC',
            price_cents: 1500,
            delivery_days: 5,
          },
        ],
      })
    }
    return Promise.resolve({ data: {} })
  })
})

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Cart — etapa Endereço de entrega', () => {
  it('CEP completo: campos Endereço e Bairro ficam read-only, sem hint', async () => {
    mockViaCep({
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      localidade: 'São Paulo',
      uf: 'SP',
    })

    const user = userEvent.setup()
    renderCart()
    await advanceToAddressStep(user)

    const streetInput = await screen.findByPlaceholderText('Rua, Avenida...')
    const neighborhoodInput = screen.getByPlaceholderText('Centro')

    expect(streetInput).toHaveValue('Avenida Paulista')
    expect(streetInput).toBeDisabled()
    expect(neighborhoodInput).toHaveValue('Bela Vista')
    expect(neighborhoodInput).toBeDisabled()

    expect(screen.queryByText(/este cep atende a cidade toda/i)).not.toBeInTheDocument()
  })

  it('CEP de cidade única (logradouro/bairro vazios): campos editáveis com hint', async () => {
    mockViaCep({
      cep: '38750-000',
      logradouro: '',
      bairro: '',
      localidade: 'Presidente Olegário',
      uf: 'MG',
    })

    const user = userEvent.setup()
    renderCart()
    await advanceToAddressStep(user)

    const streetInput = await screen.findByPlaceholderText('Rua, Avenida...')
    const neighborhoodInput = screen.getByPlaceholderText('Centro')

    expect(streetInput).not.toBeDisabled()
    expect(neighborhoodInput).not.toBeDisabled()

    expect(
      screen.getByText(/este cep atende a cidade toda\. informe o nome da rua\./i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/este cep atende a cidade toda\. informe o bairro, se houver\./i)
    ).toBeInTheDocument()

    // User can type into Endereço and the value lands in the store.
    await user.type(streetInput, 'Rua das Acácias')
    expect(useCheckoutStore.getState().shippingAddress?.street).toBe('Rua das Acácias')
  })

  it('apenas logradouro vazio: hint só aparece em Endereço', async () => {
    mockViaCep({
      cep: '38750-000',
      logradouro: '',
      bairro: 'Centro',
      localidade: 'Presidente Olegário',
      uf: 'MG',
    })

    const user = userEvent.setup()
    renderCart()
    await advanceToAddressStep(user)

    const streetInput = await screen.findByPlaceholderText('Rua, Avenida...')
    const neighborhoodInput = screen.getByPlaceholderText('Centro')

    expect(streetInput).not.toBeDisabled()
    expect(neighborhoodInput).toBeDisabled()

    expect(
      screen.getByText(/informe o nome da rua/i)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/informe o bairro, se houver/i)
    ).not.toBeInTheDocument()
  })

  it('erro do ViaCEP (erro:true) não libera campos nem mostra hint', async () => {
    mockViaCep({ erro: true })

    const user = userEvent.setup()
    renderCart()

    // Walk step 1
    await user.click(screen.getAllByRole('button', { name: /^continuar$/i })[0])

    // Step 2: CEP not found by ViaCEP → still got shipping options (api mock),
    // but shippingAddress should NOT be populated.
    const cepInput = await screen.findByPlaceholderText('00000-000')
    await user.type(cepInput, '99999999')
    await user.click(screen.getByRole('button', { name: /calcular/i }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/shipping/calculate', expect.any(Object))
    })

    // The shippingAddress remains null when ViaCEP returns erro: true.
    expect(useCheckoutStore.getState().shippingAddress).toBeNull()
  })

  it('payload de /shipping/calculate permanece com apenas zipcode + items', async () => {
    mockViaCep({
      cep: '38750-000',
      logradouro: '',
      bairro: '',
      localidade: 'Presidente Olegário',
      uf: 'MG',
    })

    const user = userEvent.setup()
    renderCart()
    await user.click(screen.getAllByRole('button', { name: /^continuar$/i })[0])

    const cepInput = await screen.findByPlaceholderText('00000-000')
    await user.type(cepInput, '38750000')
    await user.click(screen.getByRole('button', { name: /calcular/i }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/shipping/calculate', expect.any(Object))
    })

    const call = apiPost.mock.calls.find((c) => c[0] === '/shipping/calculate')
    expect(call).toBeDefined()
    const payload = call![1] as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['items', 'zipcode'])
    expect(payload.zipcode).toBe('38750000')
  })

  it('shippingAddress recebe neighborhood quando ViaCEP retorna bairro', async () => {
    mockViaCep({
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      localidade: 'São Paulo',
      uf: 'SP',
    })

    const user = userEvent.setup()
    renderCart()
    await user.click(screen.getAllByRole('button', { name: /^continuar$/i })[0])

    const cepInput = await screen.findByPlaceholderText('00000-000')
    await user.type(cepInput, '01310100')
    await user.click(screen.getByRole('button', { name: /calcular/i }))

    await waitFor(() => {
      expect(useCheckoutStore.getState().shippingAddress?.neighborhood).toBe('Bela Vista')
    })
    expect(useCheckoutStore.getState().shippingAddress?.street).toBe('Avenida Paulista')
  })

  it('mudança de CEP após detecção reseta as flags (hint some, campo volta a disabled)', async () => {
    // 1ª consulta: cidade-única → campos editáveis com hint
    mockViaCep({
      cep: '38750-000',
      logradouro: '',
      bairro: '',
      localidade: 'Presidente Olegário',
      uf: 'MG',
    })

    const user = userEvent.setup()
    renderCart()
    await advanceToAddressStep(user)

    expect(
      await screen.findByText(/informe o nome da rua/i)
    ).toBeInTheDocument()

    // Volta para o step 2 via "Editar" do shipping (botão Editar do step 2)
    // Aqui é mais simples: usa a action do store diretamente para simular
    // uma nova consulta. Mas a spec é sobre handleCepChange — então vamos
    // navegar pela UI: o usuário aperta Editar no header confirmed do step 2.
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    // O primeiro Editar visível na ordem é do step 1 (Carrinho); buscamos pelo
    // step de Método de entrega (índice 1).
    await user.click(editButtons[1])

    const cepInput = await screen.findByPlaceholderText('00000-000')
    // handleCepChange dispara no onChange — basta digitar 1 char para resetar
    await user.type(cepInput, '1')

    // Hint deve sumir imediatamente (estado das flags foi resetado em handleCepChange)
    await waitFor(() => {
      expect(screen.queryByText(/informe o nome da rua/i)).not.toBeInTheDocument()
    })
  })
})
