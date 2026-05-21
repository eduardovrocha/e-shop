require "rails_helper"

RSpec.describe CouponValidator do
  let(:product) { create(:product, price_cents: 10_000) }
  let(:sale_product) do
    create(:product, price_cents: 8_000, compare_at_price_cents: 12_000)
  end

  def items_for(*products_with_qty)
    products_with_qty.map do |(prod, qty)|
      { product: prod, unit_price_cents: prod.price_cents, quantity: qty }
    end
  end

  describe "structural failures (layer 1)" do
    it "rejects unknown code" do
      result = described_class.new(code: "GHOST", cart_items: items_for([ product, 1 ])).call
      expect(result.valid?).to be(false)
      expect(result.error).to include("inválido")
    end

    it "rejects inactive coupon" do
      create(:coupon, public_code: "OFF", active: false)
      result = described_class.new(code: "OFF", cart_items: items_for([ product, 1 ])).call
      expect(result.error).to include("inativo")
    end

    it "rejects coupon outside validity window" do
      create(:coupon, public_code: "OFF", expires_at: 1.hour.ago)
      result = described_class.new(code: "OFF", cart_items: items_for([ product, 1 ])).call
      expect(result.error).to include("período")
    end

    it "rejects when total_usage_limit reached" do
      coupon = create(:coupon, public_code: "OFF", total_usage_limit: 1)
      CouponUsage.create!(coupon: coupon, email: "x@y.com",
                          order: create(:order), discount_amount_cents: 100)
      result = described_class.new(code: "OFF", cart_items: items_for([ product, 1 ])).call
      expect(result.error).to include("esgotado")
    end
  end

  describe "scope filters" do
    it "applies only to listed products when scope='specific_products'" do
      eligible   = create(:product, price_cents: 10_000)
      ineligible = create(:product, price_cents: 5_000)
      coupon = create(:coupon, :specific_products, public_code: "TEN",
                                                  discount_percent: 10)
      coupon.coupon_products.create!(product: eligible)

      result = described_class.new(
        code: "TEN",
        cart_items: items_for([ eligible, 1 ], [ ineligible, 1 ])
      ).call

      expect(result.valid?).to be(true)
      expect(result.discount_cents).to eq(1_000) # 10% of 10_000, not of 15_000
      expect(result.eligible_items.map { |i| i[:product].id }).to eq([ eligible.id ])
    end

    it "rejects when zero products match the scope" do
      eligible   = create(:product)
      ineligible = create(:product)
      coupon = create(:coupon, :specific_products, public_code: "ONLY")
      coupon.coupon_products.create!(product: eligible)

      result = described_class.new(
        code: "ONLY", cart_items: items_for([ ineligible, 1 ])
      ).call
      expect(result.error).to include("elegível")
    end
  end

  describe "applies_to_sale_items rule" do
    it "ignores products with compare_at_price when flag is false (default)" do
      create(:coupon, public_code: "NOSALE", discount_percent: 10)
      result = described_class.new(
        code: "NOSALE",
        cart_items: items_for([ product, 1 ], [ sale_product, 1 ])
      ).call
      expect(result.discount_cents).to eq(1_000) # 10% of 10_000 only
    end

    it "includes sale items when flag is true and uses price_cents (not compare_at_price)" do
      create(:coupon, :sale_items, public_code: "ALLIN", discount_percent: 10)
      result = described_class.new(
        code: "ALLIN",
        cart_items: items_for([ product, 1 ], [ sale_product, 1 ])
      ).call
      # 10% of (10_000 + 8_000) = 1_800. Uses price_cents (8000), never compare_at.
      expect(result.discount_cents).to eq(1_800)
    end
  end

  describe "per_customer_limit (layer 2)" do
    let!(:coupon) do
      create(:coupon, public_code: "ONCE", per_customer_limit: 1, discount_percent: 10)
    end

    it "rejects email already at limit" do
      CouponUsage.create!(coupon: coupon, email: "buyer@x.com",
                          order: create(:order), discount_amount_cents: 100)
      result = described_class.new(code: "ONCE", cart_items: items_for([ product, 1 ]),
                                   email: "BUYER@x.com").call
      expect(result.error).to include("número máximo")
    end

    it "passes when email under limit" do
      result = described_class.new(code: "ONCE", cart_items: items_for([ product, 1 ]),
                                   email: "buyer@x.com").call
      expect(result.valid?).to be(true)
    end
  end
end
