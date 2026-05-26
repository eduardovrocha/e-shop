require "rails_helper"

RSpec.describe OrderItem, type: :model do
  # Helper to build an OrderItem with a linked variant configured to whatever
  # gender/cut combination the spec needs. Saves several create() calls and
  # keeps each example focused on the dimension it cares about.
  def build_item(size: "M", gender: "unissex", cut: "normal")
    variant = create(:product_variant, size: size, gender: gender, cut: cut)
    build(:order_item, product_variant: variant, product: variant.product, size: variant.size)
  end

  describe "#variant_descriptors" do
    it "shows defaults explicitly (Unissex / Normal) for full disclosure" do
      item = build_item(size: "M", gender: "unissex", cut: "normal")
      expect(item.variant_descriptors).to eq("Tamanho M · Unissex · Normal")
    end

    it "shows a feminino+normal combo" do
      item = build_item(size: "G", gender: "feminino", cut: "normal")
      expect(item.variant_descriptors).to eq("Tamanho G · Feminino · Normal")
    end

    it "shows an unissex+babylook combo" do
      item = build_item(size: "P", gender: "unissex", cut: "babylook")
      expect(item.variant_descriptors).to eq("Tamanho P · Unissex · Babylook")
    end

    it "shows masculino+polo combo with size first" do
      item = build_item(size: "M", gender: "masculino", cut: "polo")
      expect(item.variant_descriptors).to eq("Tamanho M · Masculino · Polo")
    end

    it "omits size when blank but keeps gender/cut" do
      variant = create(:product_variant, gender: "feminino", cut: "babylook")
      item    = build(:order_item, product_variant: variant, product: variant.product, size: nil)
      expect(item.variant_descriptors).to eq("Feminino · Babylook")
    end

    it "returns empty string when size AND variant are absent" do
      item = build(:order_item, product_variant: nil, product: nil, size: nil)
      expect(item.variant_descriptors).to eq("")
    end
  end

  describe "profitability helpers" do
    let(:variant) { create(:product_variant) }
    let(:order)   { create(:order) }

    def build(qty:, price:, cost:)
      create(:order_item,
             order:            order,
             product_variant:  variant,
             product:          variant.product,
             quantity:         qty,
             unit_price_cents: price,
             subtotal_cents:   price * qty,
             unit_cost_cents:  cost)
    end

    it "computes cost_subtotal_cents from unit cost × quantity" do
      item = build(qty: 3, price: 5000, cost: 2000)
      expect(item.cost_subtotal_cents).to eq(6000)
    end

    it "returns nil cost_subtotal_cents when unit_cost_cents is missing" do
      item = build(qty: 3, price: 5000, cost: nil)
      expect(item.cost_subtotal_cents).to be_nil
    end

    it "computes gross_profit_cents as revenue minus cost" do
      item = build(qty: 2, price: 5000, cost: 1500)
      # revenue 10000 - cost 3000 = 7000
      expect(item.gross_profit_cents).to eq(7000)
    end

    it "returns nil gross_profit_cents when cost is missing" do
      item = build(qty: 2, price: 5000, cost: nil)
      expect(item.gross_profit_cents).to be_nil
    end

    it "supports a negative profit when cost exceeds price" do
      item = build(qty: 1, price: 2000, cost: 2500)
      expect(item.gross_profit_cents).to eq(-500)
    end

    it "computes margin_percentage rounded to 2 decimals" do
      item = build(qty: 1, price: 10000, cost: 3000)
      expect(item.margin_percentage).to eq(70.0)
    end

    it "returns nil margin_percentage when subtotal is zero (free item)" do
      item = build(qty: 1, price: 0, cost: 0)
      expect(item.margin_percentage).to be_nil
    end

    it "returns nil margin_percentage when cost is missing" do
      item = build(qty: 1, price: 10000, cost: nil)
      expect(item.margin_percentage).to be_nil
    end
  end

  describe "#descriptor_suffix" do
    it "prepends ' — ' when descriptors are present" do
      item = build_item(size: "M", gender: "feminino", cut: "babylook")
      expect(item.descriptor_suffix).to eq(" — Tamanho M · Feminino · Babylook")
    end

    it "returns empty string when there are no descriptors" do
      item = build(:order_item, product_variant: nil, product: nil, size: nil)
      expect(item.descriptor_suffix).to eq("")
    end

    it "is safe when product_variant association is missing (legacy orders)" do
      # Some legacy orders may have lost their variant link (variant deleted).
      # The helper must not blow up — it should fall back to just the size.
      item = build(:order_item, product_variant: nil, product: nil, size: "M")
      expect(item.descriptor_suffix).to eq(" — Tamanho M")
    end
  end
end
