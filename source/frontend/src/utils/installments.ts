import { formatPrice } from '@/lib/utils'

export type InstallmentCount = 1 | 2 | 3

// Single source of truth for the human-readable installment label shown
// in the /checkout payment section. The split is display-only — Stripe
// computes the real per-installment amount on the issuer side. We use
// Math.round on cents to avoid drift in the displayed value.
//
// Examples:
//   formatInstallmentLabel(15000, 1) => "À vista — R$ 150,00"
//   formatInstallmentLabel(15000, 3) => "3x de R$ 50,00 sem juros"
export function formatInstallmentLabel(
  totalCents: number,
  count: InstallmentCount
): string {
  if (count === 1) return `À vista — ${formatPrice(totalCents / 100)}`
  const perInstallmentCents = Math.round(totalCents / count)
  return `${count}x de ${formatPrice(perInstallmentCents / 100)} sem juros`
}
