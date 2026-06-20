require "rails_helper"
require "pdf/reader"

RSpec.describe OrdersReportPdf do
  def text_of(pdf_bytes)
    PDF::Reader.new(StringIO.new(pdf_bytes)).pages.map(&:text).join("\n")
  end

  let(:variant) { create(:product_variant, price_cents: 5000, unit_cost_cents: 2000) }

  def order_with_item(status:, qty: 1, price: 5000)
    order = create(:order, status: status, items_total_cents: price * qty, total_cents: price * qty)
    create(:order_item,
      order: order, product_variant: variant, product: variant.product,
      name: variant.product.name, size: variant.size,
      quantity: qty, unit_price_cents: price, subtotal_cents: price * qty,
      unit_cost_cents: 2000, production_status: :in_production)
    order
  end

  describe "#render (status único)" do
    it "inclui o número e os itens dos pedidos do status" do
      order = order_with_item(status: "processing", qty: 2)
      pdf   = described_class.new(orders: [ order ], status: "processing").render

      text = text_of(pdf)
      expect(pdf[0, 4]).to eq("%PDF")
      expect(text).to include(order.number)
      expect(text).to include(variant.product.name)
      expect(text).to include("Relatório de pedidos")
    end

    it "não quebra com caracteres fora de Windows-1252 (ex.: emoji)" do
      order = order_with_item(status: "processing")
      order.update_column(:customer_name, "Cliente 😀 Teste")

      expect {
        described_class.new(orders: [ order ], status: "processing").render
      }.not_to raise_error
    end

    it "mostra lucro e margem agregados do relatório" do
      order_with_item(status: "processing", qty: 1, price: 5000) # custo 2000 → lucro 3000

      orders = Order.where(status: "processing").to_a
      text   = text_of(described_class.new(orders: orders, status: "processing").render)

      expect(text).to include("Lucro")
      expect(text).to include("30,00") # lucro bruto agregado em reais
    end
  end

  describe "#render (agrupado por status)" do
    it "cria uma seção por status presente, separada da linha do pedido" do
      o1 = order_with_item(status: "processing")
      o2 = order_with_item(status: "delivered")

      text  = text_of(described_class.new(orders: [ o1, o2 ], status: nil).render)
      label = OrderStatusHistory.title_for("processing")

      expect(text).to include(o1.number)
      expect(text).to include(o2.number)
      expect(text).to include(OrderStatusHistory.title_for("delivered"))
      # O rótulo aparece como cabeçalho de seção E na linha "Pedido X — <status>".
      expect(text.scan(label).size).to be >= 2
    end
  end
end
