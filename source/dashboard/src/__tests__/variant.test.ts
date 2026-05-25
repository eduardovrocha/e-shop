import { describe, it, expect } from 'vitest'
import { formatVariantDescriptors } from '@/utils/variant'

// Verifies the canonical descriptor format used across OrderDetail, Inventory,
// Production and CancelOrderItemModal. If a surface diverges, prefer fixing
// the surface to call this helper instead of inlining a fork.
describe('formatVariantDescriptors', () => {
  it('returns just "Tamanho M" when gender and cut are at defaults', () => {
    expect(
      formatVariantDescriptors({ gender: 'unissex', cut: 'normal', size: 'M' }),
    ).toBe('Tamanho M')
  })

  it('appends a non-default gender after the size (size-first order)', () => {
    expect(
      formatVariantDescriptors({ gender: 'feminino', cut: 'normal', size: 'G' }),
    ).toBe('Tamanho G · Feminino')
  })

  it('appends a non-default cut after the size', () => {
    expect(
      formatVariantDescriptors({ gender: 'unissex', cut: 'babylook', size: 'P' }),
    ).toBe('Tamanho P · Babylook')
  })

  it('appends both non-default gender and cut, in that order', () => {
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
    ).toBe('Masculino')
  })

  it('returns an empty string for the all-default unissex/normal with no size', () => {
    // The caller (e.g. Inventory row) wraps the result in a <p>; an empty
    // string lets it render nothing instead of an empty paragraph.
    expect(
      formatVariantDescriptors({ gender: 'unissex', cut: 'normal' }),
    ).toBe('')
  })

  it('tolerates null values from legacy backend data', () => {
    expect(
      formatVariantDescriptors({ gender: null, cut: null, size: 'M' }),
    ).toBe('Tamanho M')
  })

  it('returns "" when absolutely nothing is provided', () => {
    expect(formatVariantDescriptors({})).toBe('')
  })
})
