require "rails_helper"

RSpec.describe Coupon, type: :model do
  describe "validations" do
    it "rejects discount_percent outside 1..100" do
      expect(build(:coupon, discount_percent: 0)).to be_invalid
      expect(build(:coupon, discount_percent: 101)).to be_invalid
      expect(build(:coupon, discount_percent: 50)).to be_valid
    end

    it "requires public_code when code_type='public'" do
      expect(build(:coupon, code_type: "public", public_code: nil)).to be_invalid
    end

    it "rejects public_code when code_type='unique'" do
      expect(build(:coupon, :unique, public_code: "X")).to be_invalid
    end

    it "rejects two coupons with the same public_code (case-insensitive normalization)" do
      create(:coupon, public_code: "WELCOME10")
      duplicate = build(:coupon, public_code: "welcome10")
      expect(duplicate).to be_invalid
    end

    it "rejects expires_at not after starts_at" do
      coupon = build(:coupon, starts_at: 2.days.from_now, expires_at: 1.day.from_now)
      expect(coupon).to be_invalid
    end
  end

  describe "immutability after first usage" do
    let(:coupon) { create(:coupon, discount_percent: 10, scope_type: "all_products") }

    before do
      order = create(:order)
      CouponUsage.create!(
        coupon: coupon, email: "a@b.com", order: order, discount_amount_cents: 100
      )
    end

    it "blocks editing discount_percent" do
      coupon.discount_percent = 20
      expect(coupon).to be_invalid
      expect(coupon.errors[:discount_percent]).to be_present
    end

    it "blocks editing scope_type" do
      coupon.scope_type = "specific_products"
      expect(coupon).to be_invalid
      expect(coupon.errors[:scope_type]).to be_present
    end

    it "still allows editing name, active, limits and validity window" do
      expect(coupon.update(name: "Novo nome", active: false,
                           total_usage_limit: 500, expires_at: 1.year.from_now)).to be(true)
    end
  end

  describe "#derived_status" do
    it "reports 'inactive' when active=false" do
      expect(build(:coupon, active: false).derived_status).to eq("inactive")
    end

    it "reports 'expired' when expires_at in the past" do
      expect(build(:coupon, expires_at: 1.day.ago).derived_status).to eq("expired")
    end

    it "reports 'scheduled' when starts_at in the future" do
      expect(build(:coupon, starts_at: 1.day.from_now).derived_status).to eq("scheduled")
    end

    it "reports 'exhausted' when usage limit reached" do
      coupon = create(:coupon, total_usage_limit: 1)
      CouponUsage.create!(coupon: coupon, email: "a@b.com",
                          order: create(:order), discount_amount_cents: 100)
      expect(coupon.derived_status).to eq("exhausted")
    end
  end
end
