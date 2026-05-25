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
