import type { TourStepDefinition } from './types'

/**
 * Phase 1 steps — store setup, pre-first-sale.
 *
 * In Phase 3 of the implementation only one placeholder step exists so the
 * provider can be exercised end-to-end. The 10 real steps land in Phase 4
 * along with their copy and target data-attributes.
 */
export const PHASE_1_STEPS: TourStepDefinition[] = [
  {
    id:       'welcome',
    phase:    1,
    route:    '/',
    target:   null,
    asModal:  true,
    title:    'Bem-vindo à sua loja.',
    body:     'Em uns 10 minutos a gente passa pelas áreas principais e você sai daqui com a loja pronta para a primeira venda.',
  },
]
