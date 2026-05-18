import type { TourStepDefinition } from './types'

/**
 * Phase 2 steps — operational flow, post-first-sale.
 *
 * Only the entry modal placeholder lives here in Phase 3. The 6 real steps
 * land in Phase 5.
 */
export const PHASE_2_STEPS: TourStepDefinition[] = [
  {
    id:       'phase_2_entry',
    phase:    2,
    route:    '/',
    target:   null,
    asModal:  true,
    title:    'Sua primeira venda chegou!',
    body:     'Quer um tour rápido pelas áreas que você vai usar agora? Leva uns 5 minutos.',
  },
]
