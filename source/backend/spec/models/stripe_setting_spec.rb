require "rails_helper"

RSpec.describe StripeSetting, type: :model do
  describe ".current" do
    it "creates a singleton with default mode 'test' on first call" do
      expect { described_class.current }.to change(described_class, :count).by(1)
      expect(described_class.current.active_mode).to eq("test")
    end

    it "returns the same record on subsequent calls" do
      first = described_class.current
      expect(described_class.current.id).to eq(first.id)
    end
  end

  describe "active-mode helpers" do
    it "returns the publishable/secret/webhook keys of the active mode" do
      setting = described_class.create!(
        active_mode:          "live",
        live_publishable_key: "pk_live_x",
        live_secret_key:      "sk_live_x",
        live_webhook_secret:  "whsec_live_x",
        test_publishable_key: "pk_test_x",
        test_secret_key:      "sk_test_x",
        test_webhook_secret:  "whsec_test_x"
      )

      expect(setting.publishable_key).to eq("pk_live_x")
      expect(setting.secret_key).to eq("sk_live_x")
      expect(setting.webhook_secret).to eq("whsec_live_x")
      expect(setting.opposite_mode).to eq("test")
      expect(setting.opposite_webhook_secret).to eq("whsec_test_x")
    end
  end

  describe "#keys_configured_for?" do
    let(:setting) { described_class.create!(active_mode: "test") }

    it "returns false when any of the three keys is blank" do
      expect(setting.keys_configured_for?("test")).to be(false)
      expect(setting.missing_keys_for("test")).to include("publishable_key", "secret_key", "webhook_secret")
    end

    it "returns true when all three keys are set" do
      setting.update!(
        test_publishable_key: "pk_test_x",
        test_secret_key:      "sk_test_x",
        test_webhook_secret:  "whsec_x"
      )
      expect(setting.keys_configured_for?("test")).to be(true)
      expect(setting.missing_keys_for("test")).to eq([])
    end

    it "raises on invalid mode" do
      expect { setting.keys_configured_for?("staging") }.to raise_error(ArgumentError)
    end
  end
end
