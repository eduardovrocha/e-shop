require "rails_helper"

RSpec.describe OrderFulfillmentService do
  # Pedido base sem itens materializados (apenas o snapshot JSONB), como o
  # webhook do Stripe e o registro manual produzem antes da materialização.
  let(:order) { create(:order, status: "paid") }

  def snapshot_for(variant, quantity:, unit_price_cents:)
    [ {
      "id"               => variant.id,
      "variant_id"       => variant.id,
      "name"             => variant.product.name,
      "size"             => variant.size,
      "quantity"         => quantity,
      "unit_price_cents" => unit_price_cents,
      "subtotal_cents"   => unit_price_cents * quantity
    } ]
  end

  describe ".create_order_items_for!" do
    it "materializa um OrderItem por item do snapshot com o preço do snapshot" do
      variant  = create(:product_variant, price_cents: 5000, stock_quantity: 10)
      snapshot = snapshot_for(variant, quantity: 2, unit_price_cents: 7000)

      described_class.create_order_items_for!(order, snapshot, [])

      item = order.order_items.reload.sole
      expect(item.product_variant).to eq(variant)
      expect(item.quantity).to eq(2)
      expect(item.unit_price_cents).to eq(7000)
      expect(item.subtotal_cents).to eq(14000)
      expect(item.production_status).to eq("pending")
    end

    it "faz snapshot do custo de produção da variante" do
      variant  = create(:product_variant, unit_cost_cents: 1200, stock_quantity: 10)
      snapshot = snapshot_for(variant, quantity: 1, unit_price_cents: 5000)

      described_class.create_order_items_for!(order, snapshot, [])

      expect(order.order_items.reload.sole.unit_cost_cents).to eq(1200)
    end
  end

  describe ".deduct_stock!" do
    it "decrementa o estoque de itens from_stock" do
      variant  = create(:product_variant, stock_quantity: 10)
      snapshot = snapshot_for(variant, quantity: 3, unit_price_cents: 5000)

      described_class.deduct_stock!(snapshot)

      expect(variant.reload.stock_quantity).to eq(7)
    end

    it "não decrementa estoque de itens made_to_order" do
      product  = create(:product, :made_to_order)
      variant  = create(:product_variant, product: product, stock_quantity: 10)
      snapshot = snapshot_for(variant, quantity: 3, unit_price_cents: 5000)

      described_class.deduct_stock!(snapshot)

      expect(variant.reload.stock_quantity).to eq(10)
    end
  end

  describe ".activate_items!" do
    it "leva itens from_stock direto para ready_to_ship via mark_paid!" do
      variant  = create(:product_variant, stock_quantity: 10)
      described_class.create_order_items_for!(order, snapshot_for(variant, quantity: 1, unit_price_cents: 5000), [])

      described_class.activate_items!(order)

      expect(order.order_items.reload.sole.production_status).to eq("ready_to_ship")
    end

    it "enfileira o avanço da fila de produção para itens made_to_order" do
      product = create(:product, :made_to_order)
      variant = create(:product_variant, product: product, stock_quantity: 10)
      described_class.create_order_items_for!(order, snapshot_for(variant, quantity: 1, unit_price_cents: 5000), [])

      expect(Production::AdvanceQueueJob).to receive(:perform_later).with(product.id)
      described_class.activate_items!(order)

      expect(order.order_items.reload.sole.production_status).to eq("paid")
    end
  end
end
