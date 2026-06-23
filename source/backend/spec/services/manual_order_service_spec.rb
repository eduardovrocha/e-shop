require "rails_helper"

RSpec.describe ManualOrderService do
  let(:admin)   { create(:user) }
  let(:variant) { create(:product_variant, price_cents: 5000, stock_quantity: 10) }

  def base_params(overrides = {})
    {
      customer:                { name: "Maria Silva", email: "maria@example.com", phone: "11988887777", tax_id: "11144477735" },
      items:                   [ { variant_id: variant.id, quantity: 2, unit_price_cents: 4500 } ],
      external_payment_method: "pix",
      shipping_mode:           "retirada",
      manual_discount_cents:   0
    }.merge(overrides)
  end

  def call(overrides = {})
    described_class.call(base_params(overrides), admin: admin)
  end

  describe "criação básica" do
    it "cria um pedido manual pago, sem Stripe, com a forma de pagamento externa" do
      result = call

      expect(result).to be_ok
      order = result.order
      expect(order).to be_persisted
      expect(order.source).to eq("manual")
      expect(order.stripe_intent_id).to be_nil
      expect(order.external_payment_method).to eq("pix")
      expect(order.paid_at).to be_present
      expect(order.created_by_admin).to eq(admin)
    end

    it "usa o preço unitário do formulário (não o da variante) e calcula os totais" do
      result = call(manual_discount_cents: 1000)
      order  = result.order

      expect(order.items_total_cents).to eq(9000)   # 2 × 4500
      expect(order.shipping_fee_cents).to eq(0)      # retirada
      expect(order.total_cents).to eq(8000)          # 9000 − 1000 desconto
      expect(order.order_items.sole.unit_price_cents).to eq(4500)
    end

    it "registra auditoria de criação com o admin e a origem manual" do
      order = call.order
      history = order.status_histories.find_by(status: "paid")
      expect(history.created_by).to eq(admin.email)
      expect(history.metadata["source"]).to eq("manual")
    end

    it "vincula o cliente por email" do
      order = call.order
      expect(order.customer).to be_present
      expect(order.customer.email).to eq("maria@example.com")
    end
  end

  describe "estoque e produção (reuso do fluxo do site)" do
    it "item from_stock deduz estoque e vai para ready_to_ship" do
      order = call.order
      expect(variant.reload.stock_quantity).to eq(8)
      expect(order.order_items.sole.production_status).to eq("ready_to_ship")
    end

    it "item sob_encomenda entra na fila de produção pelo mesmo mecanismo" do
      product = create(:product, :made_to_order)
      mto     = create(:product_variant, product: product, stock_quantity: 10)

      expect(Production::AdvanceQueueJob).to receive(:perform_later).with(product.id)
      order = call(items: [ { variant_id: mto.id, quantity: 1, unit_price_cents: 6000 } ]).order

      expect(mto.reload.stock_quantity).to eq(10) # sob_encomenda não deduz
      expect(order.order_items.sole.production_status).to eq("paid")
    end
  end

  describe "modos de envio" do
    it "manual usa manual_shipping_cost_cents como frete" do
      order = call(
        shipping_mode:              "manual",
        manual_shipping_cost_cents: 2500,
        shipping_address:           { cep: "01310-100", address: "Av. Paulista", city: "São Paulo", state: "SP", number: "1000" }
      ).order

      expect(order.shipping_mode).to eq("manual")
      expect(order.shipping_fee_cents).to eq(2500)
      expect(order.total_cents).to eq(9000 + 2500)
    end

    it "melhor_envio usa o frete cotado escolhido" do
      order = call(
        shipping_mode:      "melhor_envio",
        shipping_fee_cents: 1990,
        shipping_address:   { cep: "01310-100", address: "Av. Paulista", city: "São Paulo", state: "SP", number: "1000" }
      ).order

      expect(order.shipping_mode).to eq("melhor_envio")
      expect(order.shipping_fee_cents).to eq(1990)
    end

    it "retirada zera o frete e não exige endereço" do
      order = call(shipping_mode: "retirada").order
      expect(order.shipping_fee_cents).to eq(0)
      expect(order.delivery_method).to eq("pickup")
    end
  end

  describe "validações" do
    it "exige ao menos um item" do
      result = call(items: [])
      expect(result).not_to be_ok
      expect(result.error).to be_present
    end

    it "exige contato do cliente (nome + email ou telefone)" do
      result = call(customer: { name: "", email: "", phone: "" })
      expect(result).not_to be_ok
    end

    it "exige endereço quando o modo de envio não é retirada" do
      result = call(shipping_mode: "melhor_envio", shipping_fee_cents: 1990, shipping_address: nil)
      expect(result).not_to be_ok
    end

    it "rejeita total negativo" do
      result = call(manual_discount_cents: 999_999)
      expect(result).not_to be_ok
    end

    it "não persiste nada quando a validação falha" do
      expect { call(items: []) }.not_to change(Order, :count)
    end
  end
end
