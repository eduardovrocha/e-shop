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
    it "returns just the size when gender and cut are at defaults" do
      item = build_item(size: "M", gender: "unissex", cut: "normal")
      expect(item.variant_descriptors).to eq("Tamanho M")
    end

    it "includes non-default gender" do
      item = build_item(size: "G", gender: "feminino", cut: "normal")
      expect(item.variant_descriptors).to eq("Tamanho G · Feminino")
    end

    it "includes non-default cut" do
      item = build_item(size: "P", gender: "unissex", cut: "babylook")
      expect(item.variant_descriptors).to eq("Tamanho P · Babylook")
    end

    it "includes both non-default gender and cut" do
      item = build_item(size: "M", gender: "masculino", cut: "polo")
      expect(item.variant_descriptors).to eq("Tamanho M · Masculino · Polo")
    end

    it "omits size when blank" do
      variant = create(:product_variant, gender: "feminino", cut: "babylook")
      item    = build(:order_item, product_variant: variant, product: variant.product, size: nil)
      expect(item.variant_descriptors).to eq("Feminino · Babylook")
    end

    it "returns empty string when size is absent and variant uses defaults" do
      variant = create(:product_variant)
      item    = build(:order_item, product_variant: variant, product: variant.product, size: nil)
      expect(item.variant_descriptors).to eq("")
    end
  end

  describe "#descriptor_suffix" do
    it "prepends ' — ' when descriptors are present" do
      item = build_item(size: "M", gender: "feminino")
      expect(item.descriptor_suffix).to eq(" — Tamanho M · Feminino")
    end

    it "returns empty string when there are no descriptors" do
      variant = create(:product_variant)
      item    = build(:order_item, product_variant: variant, product: variant.product, size: nil)
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
