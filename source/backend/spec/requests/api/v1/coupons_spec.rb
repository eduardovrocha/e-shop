require "rails_helper"

RSpec.describe "Public Coupons", type: :request do
  let!(:product) { create(:product, price_cents: 10_000) }
  let!(:variant) do
    create(:product_variant, product: product, price_cents: product.price_cents)
  end
  let!(:coupon)  { create(:coupon, public_code: "TEN", discount_percent: 10) }

  let(:body) do
    {
      code: "TEN",
      items: [ { variant_id: variant.id, quantity: 1 } ]
    }
  end

  describe "POST /api/v1/coupons/validate" do
    it "returns discount_cents + requires_email_validation on success" do
      post "/api/v1/coupons/validate", params: body, as: :json
      expect(response).to have_http_status(:ok)
      parsed = response.parsed_body
      expect(parsed["valid"]).to be(true)
      expect(parsed["discount_cents"]).to eq(1_000)
      expect(parsed["requires_email_validation"]).to be(true)
      expect(parsed["eligible_product_ids"]).to eq([ product.id ])
    end

    it "returns 422 with error message when coupon is unknown" do
      post "/api/v1/coupons/validate", params: body.merge(code: "GHOST"), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("inválido")
    end
  end

  describe "POST /api/v1/coupons/validate_with_email" do
    it "rejects when email already redeemed up to per_customer_limit" do
      coupon.update!(per_customer_limit: 1)
      CouponUsage.create!(coupon: coupon, email: "buyer@x.com",
                          order: create(:order), discount_amount_cents: 100)

      post "/api/v1/coupons/validate_with_email",
        params: body.merge(email: "buyer@x.com"), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("número máximo")
    end

    it "accepts a fresh email" do
      post "/api/v1/coupons/validate_with_email",
        params: body.merge(email: "fresh@x.com"), as: :json
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["valid"]).to be(true)
    end
  end
end
