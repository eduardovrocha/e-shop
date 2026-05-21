require "rails_helper"

RSpec.describe "Admin Coupons", type: :request do
  let!(:admin)        { create(:user, role: "admin") }
  let(:admin_headers) { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }

  describe "POST /api/v1/admin/coupons" do
    it "creates a public coupon" do
      product = create(:product)

      post "/api/v1/admin/coupons",
        params: {
          name: "Welcome 10",
          discount_percent: 10,
          code_type: "public",
          public_code: "WELCOME10",
          scope_type: "specific_products",
          product_ids: [ product.id ]
        },
        headers: admin_headers, as: :json

      expect(response).to have_http_status(:created)
      body = response.parsed_body
      expect(body["public_code"]).to eq("WELCOME10")
      expect(body["product_ids"]).to eq([ product.id ])
    end

    it "rejects discount_percent=0 with 422" do
      post "/api/v1/admin/coupons",
        params: { name: "Bad", discount_percent: 0, code_type: "public",
                  public_code: "BAD", scope_type: "all_products" },
        headers: admin_headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/admin/coupons/:id" do
    let!(:coupon) { create(:coupon, public_code: "TEN", discount_percent: 10) }

    it "allows editing name and active" do
      patch "/api/v1/admin/coupons/#{coupon.id}",
        params: { name: "Renamed", active: false },
        headers: admin_headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(coupon.reload.name).to eq("Renamed")
      expect(coupon.active).to be(false)
    end

    it "rejects editing discount_percent after first usage" do
      CouponUsage.create!(coupon: coupon, email: "a@b.com",
                          order: create(:order), discount_amount_cents: 100)

      patch "/api/v1/admin/coupons/#{coupon.id}",
        params: { discount_percent: 20 },
        headers: admin_headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["errors"].join).to include("primeiro uso")
    end
  end

  describe "DELETE /api/v1/admin/coupons/:id" do
    let!(:coupon) { create(:coupon, public_code: "DEL") }

    it "deletes when no usages exist" do
      delete "/api/v1/admin/coupons/#{coupon.id}", headers: admin_headers
      expect(response).to have_http_status(:no_content)
      expect(Coupon.exists?(coupon.id)).to be(false)
    end

    it "refuses when usages exist and suggests deactivation" do
      CouponUsage.create!(coupon: coupon, email: "a@b.com",
                          order: create(:order), discount_amount_cents: 100)

      delete "/api/v1/admin/coupons/#{coupon.id}", headers: admin_headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("Desative")
    end
  end

  describe "POST /api/v1/admin/coupons/:id/generate_codes" do
    let!(:coupon) { create(:coupon, :unique) }

    it "generates the requested quantity of unique codes" do
      post "/api/v1/admin/coupons/#{coupon.id}/generate_codes",
        params: { quantity: 5 }, headers: admin_headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["generated"]).to eq(5)
      expect(coupon.coupon_codes.count).to eq(5)
    end

    it "refuses for code_type='public'" do
      public_coupon = create(:coupon, public_code: "P")
      post "/api/v1/admin/coupons/#{public_coupon.id}/generate_codes",
        params: { quantity: 5 }, headers: admin_headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "refuses quantity outside 1..1000" do
      post "/api/v1/admin/coupons/#{coupon.id}/generate_codes",
        params: { quantity: 0 }, headers: admin_headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)

      post "/api/v1/admin/coupons/#{coupon.id}/generate_codes",
        params: { quantity: 1_001 }, headers: admin_headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/v1/admin/coupons/:id/usages" do
    it "returns finalized usages with pagination metadata" do
      coupon = create(:coupon, public_code: "U")
      3.times do |i|
        CouponUsage.create!(coupon: coupon, email: "u#{i}@x.com",
                            order: create(:order), discount_amount_cents: 50)
      end

      get "/api/v1/admin/coupons/#{coupon.id}/usages", headers: admin_headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["total"]).to eq(3)
      expect(body["usages"].size).to eq(3)
    end
  end
end
