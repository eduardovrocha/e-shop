// Helpers puros do fluxo de Pedido Manual. Mantidos sem dependência de React
// para serem a única fonte de verdade dos cálculos e poderem ser testados.

export type ExternalPaymentMethod = 'pix' | 'transferencia' | 'cartao' | 'dinheiro'
export type ShippingMode = 'melhor_envio' | 'manual' | 'retirada'
export type OrderSource = 'web' | 'manual'

export const PAYMENT_METHOD_LABELS: Record<ExternalPaymentMethod, string> = {
  pix:           'PIX',
  transferencia: 'Transferência',
  cartao:        'Cartão',
  dinheiro:      'Dinheiro',
}

export const SHIPPING_MODE_LABELS: Record<ShippingMode, string> = {
  melhor_envio: 'Melhor Envio',
  manual:       'Frete manual',
  retirada:     'Retirada na loja',
}

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  web:    'Site',
  manual: 'Manual',
}

export interface ManualOrderLine {
  variant_id: number
  name: string
  size: string | null
  quantity: number
  unit_price_cents: number
}

export function lineSubtotalCents(line: Pick<ManualOrderLine, 'quantity' | 'unit_price_cents'>): number {
  return Math.max(line.quantity, 0) * Math.max(line.unit_price_cents, 0)
}

// Resolve o frete conforme o modo: retirada = 0, manual = valor digitado,
// melhor_envio = cotação escolhida.
export function resolveShippingCents(
  mode: ShippingMode,
  opts: { quoteCents?: number | null; manualCents?: number | null }
): number {
  switch (mode) {
    case 'retirada':
      return 0
    case 'manual':
      return Math.max(opts.manualCents ?? 0, 0)
    default:
      return Math.max(opts.quoteCents ?? 0, 0)
  }
}

export interface ComputeTotalsInput {
  items: Array<Pick<ManualOrderLine, 'quantity' | 'unit_price_cents'>>
  shippingMode: ShippingMode
  quoteCents?: number | null
  manualShippingCostCents?: number | null
  manualDiscountCents?: number | null
}

export interface ManualOrderTotals {
  itemsTotalCents: number
  shippingFeeCents: number
  manualDiscountCents: number
  totalCents: number
}

export function computeTotals(input: ComputeTotalsInput): ManualOrderTotals {
  const itemsTotalCents = input.items.reduce((sum, item) => sum + lineSubtotalCents(item), 0)
  const shippingFeeCents = resolveShippingCents(input.shippingMode, {
    quoteCents:  input.quoteCents,
    manualCents: input.manualShippingCostCents,
  })
  const manualDiscountCents = Math.max(input.manualDiscountCents ?? 0, 0)
  const totalCents = itemsTotalCents + shippingFeeCents - manualDiscountCents
  return { itemsTotalCents, shippingFeeCents, manualDiscountCents, totalCents }
}

export function isTotalValid(totalCents: number): boolean {
  return totalCents >= 0
}

// Converte um valor digitado em reais ("45,90" ou "45.90") para centavos.
export function brlToCents(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const reais = Number.parseFloat(normalized)
  if (Number.isNaN(reais)) return 0
  return Math.round(reais * 100)
}
