import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import {
  validateCoupon,
  validateCouponWithEmail,
} from '@/services/coupons'

// State machine for the storefront coupon UX. Backend does the real
// validation in two layers (with and without email); this component
// mirrors that flow so the user gets immediate feedback at each step.
type CouponUIState =
  | { status: 'idle' }
  | { status: 'validating_structure'; code: string }
  | { status: 'awaiting_email'; code: string; discountCents: number; eligibleProductIds: number[] }
  | { status: 'validating_email'; code: string; email: string }
  | { status: 'error'; message: string }

function extractError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error ?? fallback
  }
  return fallback
}

export function CouponInput() {
  const items         = useCartStore((s) => s.items)
  const appliedCoupon = useCartStore((s) => s.appliedCoupon)
  const applyCoupon   = useCartStore((s) => s.applyCoupon)
  const removeCoupon  = useCartStore((s) => s.removeCoupon)
  const checkoutEmail = useCheckoutStore((s) => s.contact.email)

  const [code, setCode]   = useState('')
  const [email, setEmail] = useState('')
  const [ui, setUI]       = useState<CouponUIState>({ status: 'idle' })

  // ── Already applied: render the removable chip and exit ─────────────────
  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-emerald-900">Cupom aplicado</p>
          <p className="text-sm font-semibold text-emerald-900 font-mono">
            {appliedCoupon.code}
          </p>
        </div>
        <button
          type="button"
          onClick={removeCoupon}
          aria-label={`Remover cupom ${appliedCoupon.code}`}
          className="rounded-md px-2 py-1 text-sm text-emerald-900 hover:bg-emerald-100"
        >
          ✕
        </button>
      </div>
    )
  }

  function buildItems() {
    return items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }))
  }

  async function handleStructuralValidate(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setUI({ status: 'validating_structure', code: trimmed })
    try {
      const result = await validateCoupon(trimmed, buildItems())
      // Pre-populate the email field if the customer already filled
      // contact details earlier in the checkout — but still require an
      // explicit click on "Confirmar" so the per-customer layer always
      // runs (premise #15).
      setEmail(checkoutEmail || '')
      setUI({
        status:             'awaiting_email',
        code:               trimmed,
        discountCents:      result.discount_cents,
        eligibleProductIds: result.eligible_product_ids,
      })
    } catch (err) {
      setUI({ status: 'error', message: extractError(err, 'Cupom inválido.') })
    }
  }

  async function handleEmailValidate(e: FormEvent) {
    e.preventDefault()
    if (ui.status !== 'awaiting_email') return
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return

    setUI({ status: 'validating_email', code: ui.code, email: trimmedEmail })
    try {
      const result = await validateCouponWithEmail(ui.code, trimmedEmail, buildItems())
      applyCoupon({
        code:               ui.code,
        email:              trimmedEmail,
        discountCents:      result.discount_cents,
        eligibleProductIds: result.eligible_product_ids,
      })
      setCode('')
      setUI({ status: 'idle' })
    } catch (err) {
      setUI({ status: 'error', message: extractError(err, 'Erro ao validar com e-mail.') })
    }
  }

  // ── Idle / validating / error: show the input pair ───────────────────────
  const validating = ui.status === 'validating_structure'
  return (
    <div className="rounded-xl border border-andrequice-sand bg-white p-3 space-y-2">
      <form onSubmit={handleStructuralValidate} className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          aria-label="Código do cupom"
          placeholder="Cupom de desconto"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 rounded-lg border border-andrequice-sand bg-white px-3 py-2 text-sm text-andrequice-navy placeholder:text-andrequice-border focus:border-andrequice-gold focus:outline-none focus:ring-2 focus:ring-andrequice-gold/15"
          disabled={validating || ui.status === 'awaiting_email' || ui.status === 'validating_email'}
        />
        <button
          type="submit"
          disabled={!code.trim() || validating || ui.status === 'awaiting_email' || ui.status === 'validating_email'}
          className="rounded-lg bg-andrequice-navy px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {validating ? 'Validando…' : 'Aplicar'}
        </button>
      </form>

      {ui.status === 'awaiting_email' && (
        <form onSubmit={handleEmailValidate} className="space-y-2 border-t border-andrequice-sand pt-2">
          <p className="text-xs text-andrequice-brown">
            Confirme seu e-mail para validar o limite de uso por cliente.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              autoComplete="email"
              aria-label="E-mail"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-andrequice-sand bg-white px-3 py-2 text-sm text-andrequice-navy placeholder:text-andrequice-border focus:border-andrequice-gold focus:outline-none focus:ring-2 focus:ring-andrequice-gold/15"
            />
            <button
              type="submit"
              disabled={!email.trim()}
              className="rounded-lg bg-andrequice-gold px-3 py-2 text-sm font-medium text-andrequice-navy disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        </form>
      )}

      {ui.status === 'validating_email' && (
        <p className="text-xs text-andrequice-brown">Validando…</p>
      )}

      {ui.status === 'error' && (
        <div className="flex items-start justify-between gap-2 rounded-md border border-andrequice-copper/40 bg-andrequice-copper/5 px-3 py-2">
          <p className="text-xs text-andrequice-copper">{ui.message}</p>
          <button
            type="button"
            onClick={() => setUI({ status: 'idle' })}
            className="text-xs text-andrequice-copper underline"
          >
            Tentar outro
          </button>
        </div>
      )}
    </div>
  )
}
