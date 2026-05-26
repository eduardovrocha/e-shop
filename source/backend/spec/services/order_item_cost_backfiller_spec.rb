require "rails_helper"

RSpec.describe OrderItemCostBackfiller do
  describe ".from_product" do
    let(:product) { create(:product) }
    let(:variant) { create(:product_variant, product: product, unit_cost_cents: nil) }
    let(:order)   { create(:order) }

    def make_item(unit_cost:, variant_override: nil)
      variant.update_column(:unit_cost_cents, variant_override) if variant_override
      create(:order_item,
             order:           order,
             product_variant: variant,
             product:         variant.product,
             unit_cost_cents: unit_cost)
    end

    it "fills null order_item costs from the product cost" do
      item = make_item(unit_cost: nil)
      product.update_column(:unit_cost_cents, 1500)
      expect {
        described_class.from_product(product)
      }.to change { item.reload.unit_cost_cents }.from(nil).to(1500)
    end

    it "leaves items that already have a snapshot untouched" do
      item = make_item(unit_cost: 999)
      product.update_column(:unit_cost_cents, 1500)
      expect {
        described_class.from_product(product)
      }.not_to change { item.reload.unit_cost_cents }
    end

    it "skips items whose VARIANT has its own override" do
      # When the variant already has unit_cost_cents, the product-level
      # backfill must NOT touch its order_items — the variant override
      # is the authoritative fallback and a separate from_variant call
      # handles those.
      item = make_item(unit_cost: nil, variant_override: 700)
      product.update_column(:unit_cost_cents, 1500)
      expect {
        described_class.from_product(product)
      }.not_to change { item.reload.unit_cost_cents }
    end

    it "is a no-op when the product has no cost" do
      item = make_item(unit_cost: nil)
      product.update_column(:unit_cost_cents, nil)
      expect {
        described_class.from_product(product)
      }.not_to change { item.reload.unit_cost_cents }
    end

    it "returns the number of rows touched" do
      item_a = make_item(unit_cost: nil)
      item_b = make_item(unit_cost: nil)
      _kept  = make_item(unit_cost: 500)
      product.update_column(:unit_cost_cents, 2000)

      count = described_class.from_product(product)
      expect(count).to eq(2)
      expect(item_a.reload.unit_cost_cents).to eq(2000)
      expect(item_b.reload.unit_cost_cents).to eq(2000)
    end
  end

  describe ".from_variant" do
    let(:variant) { create(:product_variant) }
    let(:order)   { create(:order) }

    def make_item(unit_cost:)
      create(:order_item,
             order:           order,
             product_variant: variant,
             product:         variant.product,
             unit_cost_cents: unit_cost)
    end

    it "fills null order_item costs with the variant cost" do
      item = make_item(unit_cost: nil)
      variant.update_column(:unit_cost_cents, 800)
      expect {
        described_class.from_variant(variant)
      }.to change { item.reload.unit_cost_cents }.from(nil).to(800)
    end

    it "leaves items that already have a snapshot untouched" do
      item = make_item(unit_cost: 1500)
      variant.update_column(:unit_cost_cents, 800)
      expect {
        described_class.from_variant(variant)
      }.not_to change { item.reload.unit_cost_cents }
    end

    it "is a no-op when the variant has no cost" do
      item = make_item(unit_cost: nil)
      variant.update_column(:unit_cost_cents, nil)
      expect {
        described_class.from_variant(variant)
      }.not_to change { item.reload.unit_cost_cents }
    end
  end

  describe "Product after_save callback" do
    let(:product) { create(:product) }
    let(:variant) { create(:product_variant, product: product, unit_cost_cents: nil) }
    let(:order)   { create(:order) }

    it "auto-fills null items the first time the cost is set" do
      item = create(:order_item, order: order, product_variant: variant, product: product, unit_cost_cents: nil)
      expect {
        product.update!(unit_cost_cents: 1500)
      }.to change { item.reload.unit_cost_cents }.from(nil).to(1500)
    end

    it "does NOT rewrite existing snapshots on subsequent edits" do
      item = create(:order_item, order: order, product_variant: variant, product: product, unit_cost_cents: 999)
      product.update!(unit_cost_cents: 1500)
      expect(item.reload.unit_cost_cents).to eq(999)
    end
  end

  describe "ProductVariant after_save callback" do
    let(:product) { create(:product) }
    let(:variant) { create(:product_variant, product: product) }
    let(:order)   { create(:order) }

    it "auto-fills null items when variant cost is set" do
      item = create(:order_item, order: order, product_variant: variant, product: product, unit_cost_cents: nil)
      expect {
        variant.update!(unit_cost_cents: 800)
      }.to change { item.reload.unit_cost_cents }.from(nil).to(800)
    end
  end
end
