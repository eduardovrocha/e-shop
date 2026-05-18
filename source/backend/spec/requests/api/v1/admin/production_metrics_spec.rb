require "rails_helper"

# Scoped to a freshly-created product so the controller's
# `where(product_variants: { product_id: product_id })` filter isolates
# this spec from residue data in the shared dev test DB (same convention
# as order_items_sort_spec.rb).
#
# Note on the "nil created_at" scenario: order_items.created_at carries a
# NOT NULL constraint at the DB level, so the legacy-data case the
# defensive `filter_map` guards against can't be reproduced in a spec.
# The guard stays as belt-and-suspenders against future schema drift or
# raw inserts that bypass the constraint.
RSpec.describe "GET /api/v1/admin/production/metrics", type: :request do
  let!(:admin)  { create(:user, email: "metrics-admin@example.com", password: "Password123!", role: "admin") }
  let(:headers) { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }
  let(:product) { create(:product, :made_to_order, name: "Metrics Test Product") }
  let(:variant) { create(:product_variant, product: product) }
  let(:order)   { create(:order) }

  def get_metrics(period_days: 30)
    get "/api/v1/admin/production/metrics",
        params:  { period_days: period_days, product_id: product.id },
        headers: headers
  end

  context "when an order item has production_completed_at but no production_started_at" do
    before do
      # Orphan row: completed without started — the production bug repro.
      create(:order_item,
        order: order, product_variant: variant, product: product,
        production_started_at:   nil,
        production_completed_at: 2.days.ago,
        production_status:       :shipped)

      # Healthy row: both timestamps present, should count.
      create(:order_item,
        order: order, product_variant: variant, product: product,
        production_started_at:   5.days.ago,
        production_completed_at: 2.days.ago,
        production_status:       :shipped)
    end

    it "returns 200 and ignores items missing production_started_at" do
      get_metrics

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["avg_production_time_hours"]).to be_a(Numeric)
      expect(body["samples"]["production_time"]).to eq(1)
    end
  end

  context "when the window has no production data at all" do
    it "returns 200 with zero values" do
      get_metrics

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["samples"]["production_time"]).to eq(0)
      expect(body["avg_production_time_hours"]).to eq(0.0)
    end
  end
end
