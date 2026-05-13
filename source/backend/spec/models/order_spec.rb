require "rails_helper"

RSpec.describe Order, type: :model do
  describe "validations" do
    it { is_expected.to validate_presence_of(:stripe_intent_id) }
    it { is_expected.to validate_inclusion_of(:status).in_array(Order::STATUSES) }
    it { is_expected.to validate_inclusion_of(:delivery_method).in_array(Order::DELIVERY_METHODS) }
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
