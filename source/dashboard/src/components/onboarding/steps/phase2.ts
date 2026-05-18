import { storeHasManufacturedProduct } from './conditions'
import type { TourStepDefinition } from './types'

/**
 * Phase 2 — operational flow, post-first-sale.
 *
 * Copy follows `docs/e-shop-onboarding-spec.md` section 6 verbatim.
 *
 * Notes:
 *  - `order_detail` uses the literal route `/orders/:id`; the provider
 *    resolves `:id` to the latest paid order at navigation time.
 *  - `shipping_workflow` (2.3) is disabled until the dashboard ships
 *    a dedicated `/shipments` operational queue page.
 *  - `production_workflow` (2.2) is gated by the same made-to-order
 *    probe used by phase 1 step 1.7.
 */
export const PHASE_2_STEPS: TourStepDefinition[] = [
  {
    id:      'phase_2_entry',
    phase:   2,
    route:   '/',
    target:  null,
    asModal: true,
    title:   'Sua primeira venda chegou!',
    body:    'Quer um tour rápido pelas áreas que você vai usar agora? Leva uns 5 minutos.',
  },
  {
    id:       'order_detail',
    phase:    2,
    route:    '/orders/:id',
    target:   '[data-tour="order-status-panel"]',
    position: 'left',
    title:    'Esse é o painel de cada pedido.',
    body:     'Status do pagamento, etapas da produção, status do envio e dados do cliente — tudo numa tela só. Cada mudança aqui dispara um e-mail automático para o cliente.',
  },
  {
    id:        'production_workflow',
    phase:     2,
    route:     '/production',
    target:    '[data-tour="production-list"]',
    position:  'top',
    title:     'A produção começa por aqui.',
    body:      'Arraste o card entre as etapas conforme o trabalho avança. Quando chegar em "Pronto para envio", o pedido sai daqui e entra na fila de envio.',
    condition: storeHasManufacturedProduct,
  },
  {
    id:       'shipping_workflow',
    phase:    2,
    route:    '/shipments',
    target:   '[data-tour="shipping-queue"]',
    position: 'top',
    title:    'Etiquetas, rastreios e baixas de envio.',
    body:     'Gera a etiqueta da transportadora, registra o código de rastreio e marca como despachado. O cliente recebe o rastreio por e-mail automaticamente.',
    enabled:  false,
  },
  {
    id:       'inventory_after_sale',
    phase:    2,
    route:    '/inventory',
    target:   '[data-tour="inventory-row"]',
    position: 'right',
    title:    'O estoque já foi descontado.',
    body:     'Esta tela mostra o saldo em tempo real e avisa quando algum produto está prestes a acabar. Você pode definir alertas por produto.',
  },
  {
    id:       'customers_intro',
    phase:    2,
    route:    '/customers',
    target:   '[data-tour="customer-card"]',
    position: 'right',
    title:    'Seus clientes ficam aqui.',
    body:     'Cada cliente acumula o histórico de pedidos, valor gasto e endereços salvos. Você pode segmentar por comportamento de compra e criar campanhas direcionadas.',
  },
  {
    id:      'phase_2_complete',
    phase:   2,
    route:   '/',
    target:  null,
    asModal: true,
    title:   'Pronto. Agora você conhece o ciclo completo.',
    body:    'Venda → produção → envio → cliente. O dashboard automatiza as transições e os clientes ficam informados sem você precisar mandar mensagem manual. Bons negócios.',
  },
]
