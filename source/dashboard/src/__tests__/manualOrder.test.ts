import { describe, it, expect } from 'vitest'
import {
  brlToCents,
  computeTotals,
  isTotalValid,
  resolveShippingCents,
} from '@/lib/manualOrder'

describe('manualOrder helpers', () => {
  describe('brlToCents', () => {
    it('converte "45,90" para 4590 centavos', () => {
      expect(brlToCents('45,90')).toBe(4590)
    })

    it('aceita separador de milhar', () => {
      expect(brlToCents('1.234,50')).toBe(123450)
    })

    it('retorna 0 para entrada inválida', () => {
      expect(brlToCents('abc')).toBe(0)
    })
  })

  describe('resolveShippingCents', () => {
    it('retirada zera o frete', () => {
      expect(resolveShippingCents('retirada', { quoteCents: 1990, manualCents: 2500 })).toBe(0)
    })

    it('manual usa o valor digitado', () => {
      expect(resolveShippingCents('manual', { manualCents: 2500 })).toBe(2500)
    })

    it('melhor_envio usa a cotação escolhida', () => {
      expect(resolveShippingCents('melhor_envio', { quoteCents: 1990 })).toBe(1990)
    })
  })

  describe('computeTotals', () => {
    const items = [
      { quantity: 2, unit_price_cents: 4500 }, // 9000
      { quantity: 1, unit_price_cents: 3000 }, // 3000
    ]

    it('soma itens + frete − desconto', () => {
      const totals = computeTotals({
        items,
        shippingMode: 'manual',
        manualShippingCostCents: 2500,
        manualDiscountCents: 1000,
      })
      expect(totals.itemsTotalCents).toBe(12000)
      expect(totals.shippingFeeCents).toBe(2500)
      expect(totals.totalCents).toBe(13500)
    })

    it('retirada não soma frete', () => {
      const totals = computeTotals({ items, shippingMode: 'retirada', manualDiscountCents: 0 })
      expect(totals.shippingFeeCents).toBe(0)
      expect(totals.totalCents).toBe(12000)
    })

    it('pode resultar em total negativo (sinalizado por isTotalValid)', () => {
      const totals = computeTotals({
        items,
        shippingMode: 'retirada',
        manualDiscountCents: 999_999,
      })
      expect(totals.totalCents).toBeLessThan(0)
      expect(isTotalValid(totals.totalCents)).toBe(false)
    })

    it('total exatamente zero é válido', () => {
      const totals = computeTotals({
        items: [{ quantity: 1, unit_price_cents: 5000 }],
        shippingMode: 'retirada',
        manualDiscountCents: 5000,
      })
      expect(totals.totalCents).toBe(0)
      expect(isTotalValid(totals.totalCents)).toBe(true)
    })
  })
})
