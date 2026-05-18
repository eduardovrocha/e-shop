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

      post webhook_url, params: raw_payload, headers: webhook_headers

      expect(response).to have_http_status(:bad_request)
      expect(Order.count).to eq(0)
    end
  end
end
