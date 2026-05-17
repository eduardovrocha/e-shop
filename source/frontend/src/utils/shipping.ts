import { formatPrice } from '@/lib/utils'

// Shape of the selected shipping option as it is stored in checkoutStore.
// We accept a subset here so callers can pass either the store entry or
// any object that matches.
export interface ShippingLineInput {
  carrier?: string | null
  service?: string | null
  priceCents?: number | null
  deliveryDays?: number | null
}

interface FormatOptions {
  // When true, the line collapses to "<label> · Grátis". The shipping
  // store doesn't carry a `type` field; the caller (page) decides based
  // on deliveryMethod === 'pickup'.
  isPickup?: boolean
  // Optional override for the user-facing label. Defaults to:
  //   - "Retirada na loja" for pickup
  //   - "{carrier} — {service}" for delivery (when both are present and
  //     distinct), or just service when carrier ≈ service.
  label?: string
}

const PICKUP_DEFAULT_LABEL = 'Retirada na loja'

function buildDeliveryLabel(input: ShippingLineInput): string {
  const carrier = (input.carrier ?? '').trim()
  const service = (input.service ?? '').trim()
  if (!carrier && !service) return ''
  if (!carrier) return service
  if (!service) return carrier
  // Avoid noisy repetition when carrier and service describe the same
  // thing (common for pickup: carrier="Retirada", service="Retirada na
  // Loja"). Falls through to the joined form otherwise.
  const lcCarrier = carrier.toLowerCase()
  const lcService = service.toLowerCase()
  if (lcCarrier === lcService) return service
  if (lcService.startsWith(lcCarrier)) return service
  if (lcCarrier.startsWith(lcService)) return carrier
  return `${carrier} — ${service}`
}

function buildDaysFragment(days: number | null | undefined): string | null {
  if (days == null || days <= 0) return null
  const plural = days !== 1
  // "até 5 dias úteis" / "até 1 dia útil"
  return `até ${days} dia${plural ? 's' : ''} úte${plural ? 'is' : 'l'}`
}

function buildPriceFragment(priceCents: number | null | undefined): string {
  if (priceCents == null || priceCents <= 0) return 'Grátis'
  return formatPrice(priceCents / 100)
}

// Single source of truth for the human-readable shipping line shown on
// /cart (accordion step 2 summary), /checkout (recap card) and anywhere
// else we need to describe the selected shipping method.
//
// Examples:
//   formatShippingLine(svc, { isPickup: true })
//     => "Retirada na loja · Grátis"
//   formatShippingLine({ carrier: "Correios", service: "PAC",
//                        priceCents: 1990, deliveryDays: 7 })
//     => "Correios — PAC · até 7 dias úteis · R$ 19,90"
export function formatShippingLine(
  input: ShippingLineInput,
  options: FormatOptions = {}
): string {
  if (options.isPickup) {
    const label = options.label
      ?? (input.service?.trim() || PICKUP_DEFAULT_LABEL)
    return `${label} · Grátis`
  }
  const label = options.label ?? buildDeliveryLabel(input)
  const days  = buildDaysFragment(input.deliveryDays)
  const price = buildPriceFragment(input.priceCents)
  return [label, days, price].filter(Boolean).join(' · ')
}
