import { describe, it, expect } from 'vitest'
import { formatVariantLine } from '@/utils/variant'

// formatVariantLine always exposes every dimension supplied by the backend
// (including the defaults Unissex / Normal). The customer-facing receipts
// and admin surfaces both demand full visibility — there's no "hide the
// default" mode.
describe('formatVariantLine', () => {
  it('shows defaults explicitly when gender and cut are unissex/normal', () => {
    expect(formatVariantLine({ gender: 'unissex', cut: 'normal', size: 'M' })).toBe(
      'Unissex · Normal · Tam. M',
    )
  })

  it('uses the custom sizeLabel when provided', () => {
    expect(
      formatVariantLine({ gender: 'unissex', cut: 'normal', size: 'M', sizeLabel: 'Tamanho' }),
    ).toBe('Unissex · Normal · Tamanho M')
  })

  it('shows non-default gender before the size', () => {
    expect(formatVariantLine({ gender: 'masculino', cut: 'normal', size: 'G' })).toBe(
      'Masculino · Normal · Tam. G',
    )
  })

  it('shows non-default cut next to the others', () => {
    expect(formatVariantLine({ gender: 'unissex', cut: 'babylook', size: 'P' })).toBe(
      'Unissex · Babylook · Tam. P',
    )
  })

  it('shows everything in gender → cut → size order', () => {
    expect(formatVariantLine({ gender: 'feminino', cut: 'babylook', size: 'M' })).toBe(
      'Feminino · Babylook · Tam. M',
    )
  })

  it('omits the size when not provided', () => {
    expect(formatVariantLine({ gender: 'masculino', cut: 'polo' })).toBe('Masculino · Polo')
  })

  it('returns an empty string when absolutely nothing is provided', () => {
    expect(formatVariantLine({})).toBe('')
  })

  it('falls back gracefully when gender and cut are null (legacy data)', () => {
    expect(formatVariantLine({ gender: null, cut: null, size: 'M' })).toBe('Tam. M')
  })
})
