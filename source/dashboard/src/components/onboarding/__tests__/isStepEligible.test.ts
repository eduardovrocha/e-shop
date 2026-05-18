import { describe, it, expect } from 'vitest'
import { isStepEligible, type TourStepDefinition } from '../steps/types'

function makeStep(overrides: Partial<TourStepDefinition> = {}): TourStepDefinition {
  return {
    id:     'test',
    phase:  1,
    route:  '/',
    target: '[data-tour="x"]',
    title:  'Title',
    body:   'Body',
    ...overrides,
  }
}

describe('isStepEligible', () => {
  it('returns true when neither disabled nor conditioned', () => {
    expect(isStepEligible(makeStep())).toBe(true)
  })

  it('returns false when enabled is explicitly false', () => {
    expect(isStepEligible(makeStep({ enabled: false }))).toBe(false)
  })

  it('returns true when condition returns true', () => {
    expect(isStepEligible(makeStep({ condition: () => true }))).toBe(true)
  })

  it('returns false when condition returns false', () => {
    expect(isStepEligible(makeStep({ condition: () => false }))).toBe(false)
  })

  it('returns false when condition throws', () => {
    expect(isStepEligible(makeStep({ condition: () => { throw new Error('boom') } }))).toBe(false)
  })

  it('treats disabled as taking precedence over condition', () => {
    expect(isStepEligible(makeStep({ enabled: false, condition: () => true }))).toBe(false)
  })
})
