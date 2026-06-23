require "rails_helper"

# PASSO 7 — prova de que um pedido manual percorre EXATAMENTE o mesmo
# mecanismo de produção/estoque do site (sem pipeline paralelo): o item
# made_to_order entra na fila e é promovido para in_production pelo mesmo
# Production::AdvanceQueueJob; o item from_stock deduz estoque na criação.
RSpec.describe "Pedido manual — integração com produção e estoque", type: :model do
  include ActiveJob::TestHelper

  let(:admin) { create(:user) }

  def manual_call(items)
    ManualOrderService.call(
      {
        customer:                { name: "Cliente Teste", email: "cliente@example.com", phone: "11999990000", tax_id: "11144477735" },
        items:                   items,
        external_payment_method: "pix",
        shipping_mode:           "retirada",
        manual_discount_cents:   0
      },
      admin: admin
    )
  end

  it "promove o item sob_encomenda para in_production via AdvanceQueueJob" do
    product = create(:product, :made_to_order, production_capacity: 3)
    variant = create(:product_variant, product: product, stock_quantity: 0)

    order = nil
    perform_enqueued_jobs do
      order = manual_call([ { variant_id: variant.id, quantity: 1, unit_price_cents: 6000 } ]).order
    end

    item = order.order_items.sole
    expect(item.production_status).to eq("in_production")
    expect(item.production_started_at).to be_present
  end

  it "deduz estoque do item pronta_entrega na criação" do
    variant = create(:product_variant, stock_quantity: 5)
    result  = manual_call([ { variant_id: variant.id, quantity: 2, unit_price_cents: 5000 } ])

    expect(result).to be_ok
    expect(variant.reload.stock_quantity).to eq(3)
    expect(result.order.order_items.sole.production_status).to eq("ready_to_ship")
  end
end
