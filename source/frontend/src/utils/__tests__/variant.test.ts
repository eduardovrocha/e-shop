import { describe, it, expect } from 'vitest'
import { formatVariantLine } from '@/utils/variant'

// Single source of truth for "what does the gender/cut/size line look like"
// in every cart / checkout / confirmation / tracking surface. If the rules
// for hiding defaults change, the test below MUST be updated alongside.
describe('formatVariantLine', () => {
  it('returns just the size with default sizeLabel "Tam." when gender and cut are at defaults', () => {
    expect(formatVariantLine({ gender: 'unissex', cut: 'normal', size: 'M' })).toBe('Tam. M')
  })

  it('uses the custom sizeLabel when provided', () => {
    expect(
      formatVariantLine({ gender: 'unissex', cut: 'normal', size: 'M', sizeLabel: 'Tamanho' }),
    ).toBe('Tamanho M')
  })

  it('includes non-default gender before the size', () => {
    expect(formatVariantLine({ gender: 'masculino', cut: 'normal', size: 'G' })).toBe(
      'Masculino · Tam. G',
    )
  })

  it('includes non-default cut before the size', () => {
    expect(formatVariantLine({ gender: 'unissex', cut: 'babylook', size: 'P' })).toBe(
      'Babylook · Tam. P',
    )
  })

  it('includes both non-default gender and cut, in gender → cut → size order', () => {
    expect(formatVariantLine({ gender: 'feminino', cut: 'babylook', size: 'M' })).toBe(
      'Feminino · Babylook · Tam. M',
    )
  })

  it('omits the size when not provided', () => {
    expect(formatVariantLine({ gender: 'masculino', cut: 'polo' })).toBe('Masculino · Polo')
  })

  it('returns an empty string when nothing is provided', () => {
    expect(formatVariantLine({})).toBe('')
  })

  it('returns an empty string when only defaults are provided without a size', () => {
    // Avoids the absurd "everything default and no size" line — the caller
    // can branch on the returned empty string to drop the whole element.
    expect(formatVariantLine({ gender: 'unissex', cut: 'normal' })).toBe('')
  })

  it('tolerates null gender and cut (e.g. legacy data from old orders)', () => {
    expect(formatVariantLine({ gender: null, cut: null, size: 'M' })).toBe('Tam. M')
  })
})
