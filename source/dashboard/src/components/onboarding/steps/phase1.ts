import { storeHasManufacturedProduct } from './conditions'
import type { TourStepDefinition } from './types'

/**
 * Phase 1 — store setup, pre-first-sale.
 *
 * Copy follows `docs/e-shop-onboarding-spec.md` section 5 verbatim. Three
 * steps are intentionally disabled until the underlying dashboard features
 * land:
 *   - inventory_link   (1.6) — no dedicated `/produtos/:id/estoque` route
 *   - content_intro    (1.8) — no CMS feature for banners/pages yet
 *
 * The route values use the dashboard's actual English-routed URLs.
 */
export const PHASE_1_STEPS: TourStepDefinition[] = [
  {
    id:      'welcome',
    phase:   1,
    route:   '/',
    target:  null,
    asModal: true,
    title:   'Bem-vindo à sua loja.',
    body:    'Em uns 10 minutos a gente passa pelas áreas principais e você sai daqui com a loja pronta para a primeira venda. Você pode pular qualquer passo e voltar depois — o progresso fica salvo.',
  },
  {
    id:       'store_config_name',
    phase:    1,
    route:    '/settings',
    target:   '[data-tour="store-config-name"]',
    position: 'right',
    title:    'Comece pelo nome.',
    body:     'É o que aparece para o cliente no checkout, no e-mail de confirmação e na nota fiscal. Pode mudar depois.',
  },
  {
    id:       'store_config_logo',
    phase:    1,
    route:    '/settings',
    target:   '[data-tour="store-config-logo"]',
    position: 'top',
    title:    'Suba sua logo.',
    body:     'Aparece no cabeçalho da loja, nos e-mails transacionais e nos comprovantes. PNG ou SVG, fundo transparente fica melhor.',
    enabled:  false,
  },
  {
    id:       'store_config_contact',
    phase:    1,
    route:    '/settings',
    target:   '[data-tour="store-config-contact"]',
    position: 'left',
    title:    'Telefone, e-mail e endereço.',
    body:     'O endereço é o ponto de origem dos envios — o cálculo de frete usa essa referência. O e-mail é o remetente das mensagens automáticas.',
  },
  {
    id:       'shipping_config',
    phase:    1,
    route:    '/shipping',
    target:   '[data-tour="shipping-config"]',
    position: 'bottom',
    title:    'Defina como você entrega.',
    body:     'Cadastre as transportadoras, faixas de CEP e regras de preço. Sem frete configurado, o checkout não consegue calcular o total — então essa etapa é obrigatória antes da primeira venda.',
  },
  {
    id:       'products_create_first',
    phase:    1,
    route:    '/products',
    target:   '[data-tour="products-new"]',
    position: 'bottom',
    title:    'Cadastre seu primeiro produto.',
    body:     'Nome, descrição, preço e fotos. Você pode duplicar este depois para criar variações mais rápido.',
  },
  {
    id:       'inventory_link',
    phase:    1,
    route:    '/inventory',
    target:   '[data-tour="inventory-quantity"]',
    position: 'right',
    title:    'Quanto você tem desse produto?',
    body:     'O estoque é descontado automaticamente a cada venda. Quando chegar a zero, o produto fica indisponível no site até você reabastecer.',
    enabled:  false,
  },
  {
    id:        'production_intro',
    phase:     1,
    route:     '/production',
    target:    '[data-tour="production-list"]',
    position:  'top',
    title:     'Acompanhe a produção aqui.',
    body:      'Como esse produto é feito sob encomenda, cada pedido entra nesta fila com as etapas que você definir — corte, costura, embalagem, o que fizer sentido para o seu fluxo.',
    condition: storeHasManufacturedProduct,
  },
  {
    id:       'content_intro',
    phase:    1,
    route:    '/content',
    target:   '[data-tour="content-list"]',
    position: 'top',
    title:    'Banners, páginas e textos da loja.',
    body:     'Aqui você edita a página inicial, cria páginas de "Sobre" ou "Trocas", e gerencia os banners promocionais. Pode deixar para depois — não bloqueia a primeira venda.',
    enabled:  false,
  },
  {
    id:       'sales_orders_overview',
    phase:    1,
    route:    '/orders',
    target:   '[data-tour="orders-table"]',
    position: 'top',
    title:    'É aqui que os pedidos vão aparecer.',
    body:     'Quando sua primeira venda entrar, ela aparece nesta lista. Cada encomenda mostra o cliente, o status do pagamento, e em que etapa da produção e do envio está.',
  },
  {
    id:      'phase_1_complete',
    phase:   1,
    route:   '/',
    target:  null,
    asModal: true,
    title:   'Loja pronta.',
    body:    'Você configurou o essencial. Quando a primeira venda chegar, a gente volta para te mostrar como acompanhar pedidos, produção e clientes. Enquanto isso, explore o dashboard à vontade — o menu de ajuda no canto superior tem o tour completo se quiser refazer alguma parte.',
  },
]
