import { describe, it, expect } from 'vitest'
import { formatVariantDescriptors } from '@/utils/variant'

// formatVariantDescriptors always shows every dimension the backend
// provides — admins demand full visibility, so unissex / normal must be
// rendered explicitly. Each surface (OrderDetail, Inventory, Production,
// CancelOrderItemModal) calls this helper for consistency.
describe('formatVariantDescriptors', () => {
  it('shows defaults explicitly when gender and cut are unissex/normal', () => {
    expect(
      formatVariantDescriptors({ gender: 'unissex', cut: 'normal', size: 'M' }),
    ).toBe('Tamanho M · Unissex · Normal')
  })

  it('shows feminino+normal combo with size first', () => {
    expect(
      formatVariantDescriptors({ gender: 'feminino', cut: 'normal', size: 'G' }),
    ).toBe('Tamanho G · Feminino · Normal')
  })

  it('shows unissex+babylook combo with size first', () => {
    expect(
      formatVariantDescriptors({ gender: 'unissex', cut: 'babylook', size: 'P' }),
    ).toBe('Tamanho P · Unissex · Babylook')
  })

  it('shows masculino+polo combo with size first', () => {
    expect(
      formatVariantDescriptors({ gender: 'masculino', cut: 'polo', size: 'M' }),
    ).toBe('Tamanho M · Masculino · Polo')
  })

  it('puts gender/cut BEFORE size when sizeFirst=false (cancel-modal layout)', () => {
    expect(
      formatVariantDescriptors({
        gender:    'feminino',
        cut:       'babylook',
        size:      'M',
        sizeFirst: false,
      }),
    ).toBe('Feminino · Babylook · Tamanho M')
  })

  it('omits size when not provided', () => {
    expect(
      formatVariantDescriptors({ gender: 'masculino', cut: 'normal' }),
    ).toBe('Masculino · Normal')
  })

  it('tolerates null gender/cut from legacy backend data', () => {
    expect(
      formatVariantDescriptors({ gender: null, cut: null, size: 'M' }),
    ).toBe('Tamanho M')
  })

  it('returns "" when absolutely nothing is provided', () => {
    expect(formatVariantDescriptors({})).toBe('')
  })
})
