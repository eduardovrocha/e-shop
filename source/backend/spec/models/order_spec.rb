require "rails_helper"

RSpec.describe Order, type: :model do
  describe "validations" do
    it { is_expected.to validate_inclusion_of(:status).in_array(Order::STATUSES) }
    it { is_expected.to validate_inclusion_of(:delivery_method).in_array(Order::DELIVERY_METHODS) }

    it "requires stripe_intent_id for web orders" do
      order = build(:order, source: "web", stripe_intent_id: nil)
      expect(order).not_to be_valid
      expect(order.errors[:stripe_intent_id]).to be_present
    end

    it "does not require stripe_intent_id for manual orders" do
      order = build(:order, source: "manual", stripe_intent_id: nil)
      expect(order).to be_valid
    end

    it "still enforces uniqueness of stripe_intent_id when present" do
      create(:order, stripe_intent_id: "pi_dup_123")
      dup = build(:order, stripe_intent_id: "pi_dup_123")
      expect(dup).not_to be_valid
      expect(dup.errors[:stripe_intent_id]).to be_present
    end
  end

  describe "manual order fields" do
    it "defaults source to web" do
      expect(Order.new.source).to eq("web")
    end

    it "exposes the source enum values" do
      expect(Order.sources.keys).to contain_exactly("web", "manual")
    end

    it "exposes the external_payment_method enum (nullable)" do
      expect(Order.external_payment_methods.keys)
        .to contain_exactly("pix", "transferencia", "cartao", "dinheiro")
      expect(Order.new.external_payment_method).to be_nil
    end

    it "exposes the shipping_mode enum" do
      expect(Order.shipping_modes.keys)
        .to contain_exactly("melhor_envio", "manual", "retirada")
    end

    it "defaults manual_discount_cents to 0" do
      expect(Order.new.manual_discount_cents).to eq(0)
    end
  end

  describe "callbacks" do
    describe "#ensure_tracking_token" do
      it "generates a unique tracking token before validation" do
        order = build(:order)
        expect(order.tracking_token).to be_blank
        order.valid?
        expect(order.tracking_token).to be_present
        expect(order.tracking_token.length).to be >= 16
      end

      it "does not overwrite an existing token" do
        order = build(:order)
        order.tracking_token = "already-set-token"
        order.valid?
        expect(order.tracking_token).to eq("already-set-token")
      end
    end

    describe "#assign_number" do
      it "assigns an AND-XXXXXX number after creation" do
        order = create(:order)
        expect(order.number).to match(/\AAND-\d{6}\z/)
        expect(order.number).to eq("AND-#{order.id.to_s.rjust(6, '0')}")
      end
    end
  end

  describe "VALID_TRANSITIONS" do
    it "defines allowed transitions for every status" do
      Order::STATUSES.each do |status|
        expect(Order::VALID_TRANSITIONS).to have_key(status),
          "Missing VALID_TRANSITIONS entry for status '#{status}'"
      end
    end

    it "only allows transitioning to known statuses" do
      Order::VALID_TRANSITIONS.each do |_from, targets|
        targets.each do |target|
          expect(Order::STATUSES).to include(target),
            "Transition target '#{target}' is not a valid status"
        end
      end
    end
  end
end
