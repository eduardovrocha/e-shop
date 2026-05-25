require "rails_helper"

# Cross-serializer spec covering the gender/cut feature surface.
# Three serializers must expose the new dimensions so storefront, dashboard
# and tracking page can render them uniformly. One file keeps the contract
# obvious — if any serializer drops a field, this spec catches it.
RSpec.describe "Variant dimensions exposure", type: :serializer do
  let(:product) { create(:product) }

  let!(:masc_normal) do
    create(:product_variant,
           product:        product,
           size:           "M",
           gender:         "masculino",
           cut:            "normal",
           sku:            "T1-MASC-M",
           stock_quantity: 5)
  end

  let!(:fem_babylook) do
    create(:product_variant,
           product:        product,
           size:           "M",
           gender:         "feminino",
           cut:            "babylook",
           sku:            "T1-FEM-M",
           stock_quantity: 3)
  end

  describe PublicProductSerializer do
    it "exposes gender + cut on each entry of variant_stock" do
      json = described_class.new(product.reload).as_json

      m = json[:variant_stock].find { |v| v[:variant_id] == masc_normal.id }
      f = json[:variant_stock].find { |v| v[:variant_id] == fem_babylook.id }

      expect(m).to include(gender: "masculino", cut: "normal")
      expect(f).to include(gender: "feminino",  cut: "babylook")
    end
  end

  describe OrderDetailSerializer do
    let(:order) { create(:order) }
    let!(:item) do
      create(:order_item,
             order:           order,
             product_variant: fem_babylook,
             product:         product,
             size:            "M")
    end

    it "derives gender + cut from the linked product_variant" do
      json     = described_class.new(order.reload).as_json
      row      = json[:order_items].find { |i| i[:id] == item.id }
      expect(row).to include(gender: "feminino", cut: "babylook", size: "M")
    end

    it "returns nil when the variant has been deleted post-purchase" do
      item.update_columns(product_variant_id: nil)
      json = described_class.new(order.reload).as_json
      row  = json[:order_items].find { |i| i[:id] == item.id }
      expect(row[:gender]).to be_nil
      expect(row[:cut]).to    be_nil
      expect(row[:size]).to   eq("M")  # snapshot still on the order_item row
    end
  end

  describe TrackingPayloadSerializer do
    let(:order) { create(:order) }
    let!(:item) do
      create(:order_item,
             order:           order,
             product_variant: masc_normal,
             product:         product,
             size:            "M")
    end

    it "exposes gender + cut on each order_items row" do
      json = described_class.new(order.reload).as_json
      row  = json[:order_items].find { |i| i[:id] == item.id }
      expect(row).to include(gender: "masculino", cut: "normal")
    end
  end
end
