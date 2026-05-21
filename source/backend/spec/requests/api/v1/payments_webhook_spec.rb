require "rails_helper"

RSpec.describe "Payments Webhook", type: :request do
  let(:webhook_url)     { "/api/v1/payments/webhook" }
  let(:webhook_headers) { { "Content-Type" => "application/json", "HTTP_STRIPE_SIGNATURE" => "t=1,v1=abc" } }
  let(:raw_payload)     { '{"id":"evt_test"}' }

  let(:intent_metadata) do
    {
      "customer_name"      => "João Teste",
      "customer_email"     => "joao@test.com",
      "customer_phone"     => "11999999999",
      "delivery_method"    => "pickup",
      "items_total_cents"  => "5000",
      "shipping_fee_cents" => "0",
      "items_snapshot"     => "[]",
      "shipping_address"   => nil
    }
  end

  let(:payment_intent) do
    double("PaymentIntent",
      id:                 "pi_test_123",
      amount:             5000,
      metadata:           intent_metadata,
      last_payment_error: nil,
    )
  end

  let(:succeeded_event) do
    double("StripeEvent",
      id:   "evt_succeeded_001",
      type: "payment_intent.succeeded",
      data: double("Data", object: payment_intent),
    )
  end

  let(:failed_event) do
    double("StripeEvent",
      id:   "evt_failed_001",
      type: "payment_intent.payment_failed",
      data: double("Data", object: payment_intent),
    )
  end

  before do
    allow(ProcessedWebhookEvent).to receive(:already_processed?).and_return(false)
    allow(ProcessedWebhookEvent).to receive(:mark_processed!)
    # Prevent actual stock deduction in webhook tests
    allow_any_instance_of(ProductVariant).to receive(:decrement_stock!)
    # Webhook secret used to be ENV-driven; now lives in StripeSetting.
    # Ensure the active mode has a secret so verify_webhook_event reaches
    # the stubbed Stripe::Webhook.construct_event instead of short-circuiting.
    StripeSetting.current.update!(test_webhook_secret: "whsec_test_secret_for_specs")
  end

  describe "payment_intent.succeeded" do
    before do
      allow(Stripe::Webhook).to receive(:construct_event).and_return(succeeded_event)
    end

    it "creates an order with status paid and returns 200" do
      expect {
        post webhook_url, params: raw_payload, headers: webhook_headers
      }.to change(Order, :count).by(1)

      expect(response).to have_http_status(:ok)
      order = Order.last
      expect(order.status).to eq("paid")
      expect(order.customer_email).to eq("joao@test.com")
      expect(order.stripe_intent_id).to eq("pi_test_123")
    end

    it "ignores duplicate events (idempotency)" do
      allow(ProcessedWebhookEvent).to receive(:already_processed?).and_return(true)

      expect {
        post webhook_url, params: raw_payload, headers: webhook_headers
      }.not_to change(Order, :count)

      expect(response).to have_http_status(:ok)
    end
  end

  describe "payment_intent.payment_failed" do
    let!(:order) { create(:order, stripe_intent_id: "pi_test_123", status: "pending") }

    before do
      allow(Stripe::Webhook).to receive(:construct_event).and_return(failed_event)
    end

    it "updates the order status to failed" do
      post webhook_url, params: raw_payload, headers: webhook_headers

      expect(response).to have_http_status(:ok)
      expect(order.reload.status).to eq("failed")
    end
  end

  describe "onboarding first-sale promotion" do
    let!(:store) { StoreSetting.instance }
    let!(:admin) { create(:user, email: "admin1@example.com", role: "admin") }

    before do
      allow(Stripe::Webhook).to receive(:construct_event).and_return(succeeded_event)
    end

    it "promotes completed users to phase_2_ready on the first paid order" do
      # The dev/test DB ships with seed paid orders that interfere with the
      # "count == 1" guard, so stub the count check rather than wipe the
      # table (FK-dense Order has child rows that block bulk delete).
      allow(Order).to receive_message_chain(:where, :count).and_return(1)
      progress = create(:onboarding_progress, :completed, user: admin, store_setting: store)

      post webhook_url, params: raw_payload, headers: webhook_headers
      expect(response).to have_http_status(:ok)

      expect(progress.reload.status).to eq("phase_2_ready")
    end

    it "does not promote on subsequent paid orders" do
      allow(Order).to receive_message_chain(:where, :count).and_return(2)
      progress = create(:onboarding_progress, :completed, user: admin, store_setting: store)

      post webhook_url, params: raw_payload, headers: webhook_headers

      expect(progress.reload.status).to eq("completed")
    end

    it "does not break the payment flow if onboarding promotion raises" do
      allow(OnboardingProgress).to receive(:fire_first_sale!).and_raise(StandardError, "boom")

      expect {
        post webhook_url, params: raw_payload, headers: webhook_headers
      }.to change(Order, :count).by(1)

      expect(response).to have_http_status(:ok)
    end
  end

  describe "invalid webhook signature" do
    it "returns 400 bad_request on signature verification failure" do
      allow(Stripe::Webhook).to receive(:construct_event)
        .and_raise(Stripe::SignatureVerificationError.new("bad sig", "raw"))

      # No-new-order assertion via :change scoped to this request — the
      # global test DB has pre-existing seeded orders so an absolute
      # `Order.count == 0` is misleading.
      expect {
        post webhook_url, params: raw_payload, headers: webhook_headers
      }.not_to change(Order, :count)

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "signature fallback to opposite-mode secret" do
    before do
      # Active mode = test, but the event is signed with the live secret
      # (e.g. webhook arrives after admin alternou de live → test).
      StripeSetting.current.update!(
        active_mode:         "test",
        test_webhook_secret: "whsec_test_secret",
        live_webhook_secret: "whsec_live_secret"
      )
    end

    it "validates with the opposite-mode secret when the primary fails" do
      call_count = 0
      allow(Stripe::Webhook).to receive(:construct_event) do |_payload, _sig, secret|
        call_count += 1
        if secret == "whsec_test_secret"
          raise Stripe::SignatureVerificationError.new("bad sig", "raw")
        end
        succeeded_event
      end

      post webhook_url, params: raw_payload, headers: webhook_headers

      expect(call_count).to eq(2)
      expect(response).to have_http_status(:ok)
    end

    it "returns 400 when both secrets fail" do
      allow(Stripe::Webhook).to receive(:construct_event)
        .and_raise(Stripe::SignatureVerificationError.new("bad sig", "raw"))

      post webhook_url, params: raw_payload, headers: webhook_headers
      expect(response).to have_http_status(:bad_request)
    end
  end
end
