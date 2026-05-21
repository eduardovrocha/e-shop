require "rails_helper"

RSpec.describe CouponApplier do
  let(:product) { create(:product, price_cents: 10_000) }
  let(:cart)    { [ { product: product, unit_price_cents: 10_000, quantity: 1 } ] }

  describe ".reserve!" do
    let!(:coupon) { create(:coupon, public_code: "TEN", discount_percent: 10) }

    it "creates a CouponUsage reservation without an Order" do
      result = described_class.reserve!(
        code:       "TEN",
        cart_items: cart,
        email:      "buyer@example.com",
        stripe_intent_id: nil
      )

      usage = result.usage
      expect(usage.order_id).to be_nil
      expect(usage.email).to eq("buyer@example.com")
      expect(usage.discount_amount_cents).to eq(1_000)
      expect(result.discount_cents).to eq(1_000)
    end

    it "raises CouponNoLongerValid when the slot just got taken" do
      coupon.update!(total_usage_limit: 1)
      described_class.reserve!(code: "TEN", cart_items: cart, email: "a@x.com")

      expect {
        described_class.reserve!(code: "TEN", cart_items: cart, email: "b@x.com")
      }.to raise_error(CouponApplier::CouponNoLongerValid, /esgotado/i)
    end

    it "raises when the same email exceeds per_customer_limit" do
      coupon.update!(per_customer_limit: 1)
      described_class.reserve!(code: "TEN", cart_items: cart, email: "same@x.com")

      expect {
        described_class.reserve!(code: "TEN", cart_items: cart, email: "SAME@x.com")
      }.to raise_error(CouponApplier::CouponNoLongerValid)
    end
  end

  describe ".finalize!" do
    let!(:coupon) { create(:coupon, public_code: "TEN", discount_percent: 10) }

    it "attaches order_id and snapshots discount columns" do
      reservation = described_class.reserve!(
        code: "TEN", cart_items: cart, email: "buyer@x.com"
      )
      described_class.attach_intent!(reservation.usage, "pi_xyz")

      order = create(:order)
      described_class.finalize!(stripe_intent_id: "pi_xyz", order: order)

      usage = reservation.usage.reload
      order.reload

      expect(usage.order_id).to eq(order.id)
      expect(order.coupon_id).to eq(coupon.id)
      expect(order.coupon_code_used).to eq("TEN")
      expect(order.discount_percent_applied).to eq(10)
      expect(order.discount_amount_cents).to eq(1_000)
    end

    it "is a no-op when no reservation matches the intent" do
      order = create(:order)
      expect {
        described_class.finalize!(stripe_intent_id: "pi_nope", order: order)
      }.not_to change(CouponUsage, :count)
    end
  end

  describe ".release!" do
    it "deletes only intent-stage reservations, never finalized usages" do
      coupon = create(:coupon, public_code: "TEN")

      reservation = CouponUsage.create!(
        coupon: coupon, email: "a@b.com", stripe_intent_id: "pi_a",
        discount_amount_cents: 100
      )
      finalized = CouponUsage.create!(
        coupon: coupon, email: "c@d.com", order: create(:order),
        stripe_intent_id: "pi_b", discount_amount_cents: 100
      )

      described_class.release!(stripe_intent_id: "pi_a")
      described_class.release!(stripe_intent_id: "pi_b")

      expect(CouponUsage.exists?(reservation.id)).to be(false)
      expect(CouponUsage.exists?(finalized.id)).to be(true)
    end
  end
end
