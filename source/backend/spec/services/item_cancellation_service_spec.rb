require "rails_helper"
require "ostruct"

RSpec.describe ItemCancellationService do
  let(:mto_product) do
    create(:product, :made_to_order,
           production_capacity: 3,
           production_lead_time_days: 14,
           cancellation_refund_percentage: 70)
  end
  let(:fs_product) { create(:product) }
  let(:mto_variant) { create(:product_variant, product: mto_product, price_cents: 12_000) }
  let(:fs_variant)  { create(:product_variant, product: fs_product,  price_cents: 5_000) }
  let(:admin)       { create(:user) }
  let(:order) do
    create(:order, stripe_intent_id: "pi_test_#{SecureRandom.hex(6)}", total_cents: 12_000, items_total_cents: 12_000)
  end

  def stub_stripe_refund(id: "re_test_#{SecureRandom.hex(4)}")
    refund = OpenStruct.new(id: id, amount: 0)
    allow(Stripe::Refund).to receive(:create).and_return(refund)
    refund
  end

  context "when item is made_to_order and :paid" do
    let(:item) do
      create(:order_item, order: order, product_variant: mto_variant, product: mto_product,
                          subtotal_cents: 12_000, quantity: 1, production_status: :paid)
    end

    it "creates a Stripe refund for the configured percentage and transitions to canceled" do
      stub_stripe_refund

      result = described_class.new(order_item: item, reason: "cliente desistiu", actor: admin, actor_type: :admin).call

      expect(result.success?).to be true
      expect(result.status).to eq(:ok)
      expect(result.payload[:refund_amount_cents]).to eq(8_400) # 70% of 12000
      expect(result.payload[:refund_percentage]).to eq(70)
      expect(item.reload.production_status).to eq("canceled")
    end

    it "passes the right metadata and amount to Stripe" do
      # Second positional arg is Stripe RequestOptions ({ api_key: ... })
      # sourced from StripeSetting.current — assert presence, not value.
      expect(Stripe::Refund).to receive(:create).with(
        hash_including(
          payment_intent: order.stripe_intent_id,
          amount:         8_400,
          metadata:       hash_including(order_item_id: item.id, cancellation_percentage: 70)
        ),
        hash_including(:api_key)
      ).and_return(OpenStruct.new(id: "re_x"))

      described_class.new(order_item: item, reason: "x", actor: admin, actor_type: :admin).call
    end

    it "records an OrderStatusHistory entry with refund metadata" do
      refund = stub_stripe_refund(id: "re_specific_123")

      expect {
        described_class.new(order_item: item, reason: "trocou de ideia", actor: admin, actor_type: :admin).call
      }.to change { OrderStatusHistory.count }.by_at_least(1)

      history = OrderStatusHistory.where(order: order).order(:created_at).last
      expect(history.metadata["stripe_refund_id"]).to eq(refund.id)
      expect(history.metadata["order_item_id"]).to eq(item.id)
      expect(history.metadata["refund_amount_cents"]).to eq(8_400)
      expect(history.created_by).to eq("admin:#{admin.id}")
    end
  end

  context "when item is made_to_order and :in_production" do
    let(:item) do
      create(:order_item, order: order, product_variant: mto_variant, product: mto_product,
                          subtotal_cents: 12_000, quantity: 1, production_status: :in_production)
    end

    it "cancels successfully and frees a slot (enqueues AdvanceQueueJob)" do
      stub_stripe_refund

      expect {
        described_class.new(order_item: item, reason: nil, actor: admin, actor_type: :admin).call
      }.to have_enqueued_job(Production::AdvanceQueueJob).with(mto_product.id)

      expect(item.reload.production_status).to eq("canceled")
    end
  end

  context "when item is from_stock" do
    let(:item) do
      create(:order_item, order: order, product_variant: fs_variant, product: fs_product,
                          subtotal_cents: 5_000, quantity: 1, production_status: :paid)
    end

    it "rejects with from_stock_cancellation_not_supported" do
      result = described_class.new(order_item: item, actor: admin, actor_type: :admin).call

      expect(result.success?).to be false
      expect(result.status).to eq(:unprocessable_entity)
      expect(result.payload[:error]).to eq("from_stock_cancellation_not_supported")
      expect(item.reload.production_status).to eq("paid")
    end
  end

  context "when item is already :canceled" do
    let(:item) do
      create(:order_item, order: order, product_variant: mto_variant, product: mto_product,
                          subtotal_cents: 12_000, quantity: 1, production_status: :canceled)
    end

    it "rejects with invalid_transition" do
      result = described_class.new(order_item: item, actor: admin, actor_type: :admin).call

      expect(result.success?).to be false
      expect(result.status).to eq(:unprocessable_entity)
      expect(result.payload[:error]).to eq("invalid_transition")
    end
  end

  context "actor_type customer" do
    let(:customer) { create(:customer) }
    let(:item) do
      create(:order_item, order: order, product_variant: mto_variant, product: mto_product,
                          subtotal_cents: 12_000, quantity: 1, production_status: :paid)
    end

    it "records actor as customer:id and includes it in metadata" do
      stub_stripe_refund

      described_class.new(order_item: item, actor: customer, actor_type: :customer).call

      history = OrderStatusHistory.where(order: order).order(:created_at).last
      expect(history.created_by).to eq("customer:#{customer.id}")
      expect(history.metadata["actor_type"]).to eq("customer")
    end

    it "enqueues a ProductionMailer#item_canceled email" do
      stub_stripe_refund

      expect {
        described_class.new(order_item: item, actor: customer, actor_type: :customer).call
      }.to have_enqueued_mail(ProductionMailer, :item_canceled)
    end
  end

  context "invalid actor_type" do
    let(:item) do
      create(:order_item, order: order, product_variant: mto_variant, product: mto_product,
                          subtotal_cents: 12_000, quantity: 1, production_status: :paid)
    end

    it "raises ArgumentError when actor_type is unknown" do
      expect {
        described_class.new(order_item: item, actor: admin, actor_type: :ghost)
      }.to raise_error(ArgumentError, /actor_type/)
    end

    it "raises ArgumentError when actor_type is missing" do
      expect {
        described_class.new(order_item: item, actor: admin, actor_type: nil)
      }.to raise_error(ArgumentError, /actor_type/)
    end
  end

  context "when Stripe fails" do
    let(:item) do
      create(:order_item, order: order, product_variant: mto_variant, product: mto_product,
                          subtotal_cents: 12_000, quantity: 1, production_status: :paid)
    end

    it "returns a 502 error and leaves the item state untouched" do
      allow(Stripe::Refund).to receive(:create).and_raise(
        Stripe::APIError.new("Stripe is down")
      )

      result = described_class.new(order_item: item, actor: admin, actor_type: :admin).call

      expect(result.success?).to be false
      expect(result.status).to eq(:bad_gateway)
      expect(result.payload[:error]).to eq("stripe_refund_failed")
      expect(item.reload.production_status).to eq("paid")
    end
  end
end
