require "rails_helper"

# PK sequence reset is not transactional in Postgres — once the service
# runs setval(seq, 1), a subsequent rollback won't restore the sequence.
# These specs need both row-level isolation AND sequence reset between
# examples; TRUNCATE ... RESTART IDENTITY in a non-transactional context
# is the cleanest way to get there.
RSpec.describe ReleaseWipeService, :non_transactional do
  let(:admin) { create(:user, role: "super_admin") }

  before do
    # Tables that the wipe touches — plus release_executions itself so the
    # "already executed" gate starts fresh in every example. Sequences are
    # reset by RESTART IDENTITY so factory rows don't collide with stale
    # ids from prior runs.
    tables = %w[
      orders order_items order_status_histories
      customers customer_addresses
      processed_webhook_events onboarding_progresses
      release_executions
    ]
    ActiveRecord::Base.connection.execute(
      "TRUNCATE #{tables.join(', ')} RESTART IDENTITY CASCADE"
    )
  end

  describe ".call" do
    context "on a fresh database" do
      it "deletes orders, order_items, customers and resets stock reservations" do
        order = create(:order, status: "paid")
        variant = order.order_items.first&.product_variant ||
                  create(:product_variant, reserved_quantity: 5)
        variant.update!(reserved_quantity: 5)
        create(:customer)

        result = described_class.call(user: admin, ip_address: "10.0.0.1")

        expect(result.ok?).to be(true)
        expect(Order.count).to eq(0)
        expect(OrderItem.count).to eq(0)
        expect(Customer.count).to eq(0)
        expect(CustomerAddress.count).to eq(0)
        expect(ProcessedWebhookEvent.count).to eq(0)
        expect(OnboardingProgress.count).to eq(0)
        expect(variant.reload.reserved_quantity).to eq(0)
      end

      it "creates an audit ReleaseExecution row with the operator + counts" do
        create(:order)

        expect {
          described_class.call(user: admin, ip_address: "10.0.0.1")
        }.to change(ReleaseExecution, :count).by(1)

        execution = ReleaseExecution.last
        expect(execution.user_id).to eq(admin.id)
        expect(execution.ip_address).to eq("10.0.0.1")
        expect(execution.orders_deleted).to be >= 1
      end

      it "preserves products, users, store_settings, stripe_settings and shipping_settings" do
        create(:product)
        StoreSetting.instance
        StripeSetting.current
        ShippingSetting.instance

        described_class.call(user: admin, ip_address: nil)

        expect(Product.count).to be >= 1
        expect(User.count).to be >= 1
        expect(StoreSetting.count).to eq(1)
        expect(StripeSetting.count).to eq(1)
        expect(ShippingSetting.count).to eq(1)
      end

      it "resets the PK sequence of orders back to 1" do
        described_class.call(user: admin, ip_address: nil)

        order = create(:order)
        expect(order.id).to eq(1)
      end
    end

    context "when a previous ReleaseExecution exists" do
      before { create(:user) && described_class.call(user: admin, ip_address: nil) }

      it "refuses a second call without the ENV override" do
        result = described_class.call(user: admin, ip_address: nil)

        expect(result.ok?).to be(false)
        expect(result.error).to include("Release wipe já executado")
      end

      it "permits re-execution when ALLOW_RELEASE_REWIPE=yes" do
        stub_const("ENV", ENV.to_h.merge("ALLOW_RELEASE_REWIPE" => "yes"))
        # ENV.to_h + stub_const above replaces ENV inside the example.
        # The service reads ENV["ALLOW_RELEASE_REWIPE"] at call time.

        result = described_class.call(user: admin, ip_address: nil)
        expect(result.ok?).to be(true)
      end
    end
  end
end
