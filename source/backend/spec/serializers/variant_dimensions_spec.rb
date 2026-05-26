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

    it "exposes unit_cost_cents and the derived profit metrics" do
      item.update!(unit_cost_cents: 2000, unit_price_cents: 5000, quantity: 2, subtotal_cents: 10000)
      json = described_class.new(order.reload).as_json
      row  = json[:order_items].find { |i| i[:id] == item.id }
      expect(row[:unit_cost_cents]).to     eq(2000)
      expect(row[:cost_subtotal_cents]).to eq(4000)
      expect(row[:gross_profit_cents]).to  eq(6000)
      expect(row[:margin_percentage]).to   eq(60.0)
    end

    describe "order-level profit aggregates" do
      let(:variant_b) { create(:product_variant, product: product, sku: "T1-MASC-G", size: "G") }
      let!(:item_b) do
        create(:order_item,
               order:            order,
               product_variant:  variant_b,
               product:          product,
               quantity:         1,
               unit_price_cents: 3000,
               subtotal_cents:   3000)
      end

      it "sums cost + profit across all items with snapshots" do
        item.update!(unit_cost_cents: 2000, quantity: 2, subtotal_cents: 10000)
        item_b.update!(unit_cost_cents: 1500, quantity: 1, subtotal_cents: 3000)
        json = described_class.new(order.reload).as_json
        # cost = 2*2000 + 1500 = 5500; revenue = 10000 + 3000 = 13000;
        # profit = 7500; margin = 7500/13000 ≈ 57.69%
        expect(json[:total_cost_cents]).to         eq(5500)
        expect(json[:order_gross_profit_cents]).to eq(7500)
        expect(json[:order_margin_percentage]).to  eq(57.69)
        expect(json[:items_with_cost_count]).to    eq(2)
        expect(json[:items_missing_cost_count]).to eq(0)
      end

      it "excludes items without a cost snapshot from the rollup" do
        item.update!(unit_cost_cents: 2000, quantity: 1, subtotal_cents: 5000)
        item_b.update!(unit_cost_cents: nil)
        json = described_class.new(order.reload).as_json
        # Only item (5000 - 2000 = 3000) counted; item_b is in the
        # missing-cost bucket so the rollup is honest about its scope.
        expect(json[:total_cost_cents]).to         eq(2000)
        expect(json[:order_gross_profit_cents]).to eq(3000)
        expect(json[:items_with_cost_count]).to    eq(1)
        expect(json[:items_missing_cost_count]).to eq(1)
      end

      it "collapses to nil when no items have cost (UI shows CTA)" do
        item.update!(unit_cost_cents: nil)
        item_b.update!(unit_cost_cents: nil)
        json = described_class.new(order.reload).as_json
        expect(json[:total_cost_cents]).to         be_nil
        expect(json[:order_gross_profit_cents]).to be_nil
        expect(json[:order_margin_percentage]).to  be_nil
        expect(json[:items_with_cost_count]).to    eq(0)
        expect(json[:items_missing_cost_count]).to eq(2)
      end

      it "handles a loss (cost > revenue) with negative profit" do
        item.update!(unit_cost_cents: 5000, quantity: 1, subtotal_cents: 2000)
        item_b.update!(unit_cost_cents: nil)
        json = described_class.new(order.reload).as_json
        expect(json[:order_gross_profit_cents]).to eq(-3000)
        expect(json[:order_margin_percentage]).to  eq(-150.0)
      end
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

  # unit_cost_cents is admin-only — must never leak through public APIs
  # that customers can hit. Spec guards both layers: the storefront product
  # endpoint and the public tracking page.
  describe "unit_cost_cents privacy" do
    before do
      product.update!(unit_cost_cents: 999)
      masc_normal.update!(unit_cost_cents: 1234)
    end

    it "is NOT exposed by PublicProductSerializer" do
      json = PublicProductSerializer.new(product.reload).as_json
      flat = JSON.parse(json.to_json)  # deep-stringify-keys
      expect(flat.to_s).not_to include("unit_cost_cents")
      expect(flat.to_s).not_to include("999")
      expect(flat.to_s).not_to include("1234")
    end

    it "is NOT exposed by TrackingPayloadSerializer" do
      order = create(:order)
      create(:order_item,
             order:            order,
             product_variant:  masc_normal,
             product:          product,
             unit_cost_cents:  1234)
      json = TrackingPayloadSerializer.new(order.reload).as_json
      flat = JSON.parse(json.to_json)
      # Per-item profit fields
      expect(flat.to_s).not_to include("unit_cost_cents")
      expect(flat.to_s).not_to include("cost_subtotal")
      expect(flat.to_s).not_to include("gross_profit")
      expect(flat.to_s).not_to include("margin")
      # Order-level aggregates introduced for the footer
      expect(flat.to_s).not_to include("total_cost_cents")
      expect(flat.to_s).not_to include("order_gross_profit")
      expect(flat.to_s).not_to include("order_margin")
      expect(flat.to_s).not_to include("items_with_cost_count")
      expect(flat.to_s).not_to include("items_missing_cost_count")
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
