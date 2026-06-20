import { describe, expect, it } from 'vitest'
import { maskPhoneBR } from '@/lib/utils'

describe('maskPhoneBR', () => {
  it('formata celular de 11 dígitos', () => {
    expect(maskPhoneBR('34999999999')).toBe('(34) 99999-9999')
  })

  it('formata fixo de 10 dígitos', () => {
    expect(maskPhoneBR('3433334444')).toBe('(34) 3333-4444')
  })

  it('limita a 11 dígitos', () => {
    expect(maskPhoneBR('349999999999')).toBe('(34) 99999-9999')
  })

  it('formata progressivamente e ignora não-dígitos', () => {
    expect(maskPhoneBR('34')).toBe('(34')
    expect(maskPhoneBR('349')).toBe('(34) 9')
    expect(maskPhoneBR('abc11')).toBe('(11')
  })

  it('retorna vazio para entrada vazia', () => {
    expect(maskPhoneBR('')).toBe('')
  })
})
