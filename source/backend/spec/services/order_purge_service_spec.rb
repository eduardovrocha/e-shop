require "rails_helper"

RSpec.describe OrderPurgeService do
  # StringIO buffer avoids polluting test output with the service's
  # verbose report — and lets us assert on what was printed.
  let(:io) { StringIO.new }

  describe ".run" do
    it "raises when called with no identifiers" do
      expect {
        described_class.run(identifiers: [], io: io)
      }.to raise_error(ArgumentError, /at least one/)
    end

    context "dry run (default)" do
      let!(:product) { create(:product) }
      let!(:variant) { create(:product_variant, product: product, stock_quantity: 5) }
      let!(:order)   { create(:order, customer_email: "buyer@example.com") }
      let!(:item)    { create(:order_item, order: order, product_variant: variant, product: product, quantity: 2) }

      it "does NOT delete the order" do
        described_class.run(identifiers: [ order.number ], io: io)
        expect(Order.exists?(order.id)).to be true
      end

      it "does NOT restore stock" do
        expect {
          described_class.run(identifiers: [ order.number ], io: io)
        }.not_to change { variant.reload.stock_quantity }
      end

      it "reports what would happen" do
        result = described_class.run(identifiers: [ order.number ], io: io)
        expect(result.found).to eq(1)
        expect(result.destroyed_count).to eq(1)
        expect(result.restored_stock[variant.id]).to eq(2)
        expect(result.dry_run).to be true
        expect(io.string).to include("DRY RUN")
        expect(io.string).to include(order.number)
      end
    end

    context "committed run" do
      let!(:product) { create(:product) }
      let!(:variant) { create(:product_variant, product: product, stock_quantity: 5) }
      let!(:order)   { create(:order, customer_email: "buyer@example.com") }
      let!(:item)    { create(:order_item, order: order, product_variant: variant, product: product, quantity: 2) }

      it "deletes the order" do
        described_class.run(identifiers: [ order.number ], dry_run: false, io: io)
        expect(Order.exists?(order.id)).to be false
      end

      it "restores stock for from_stock items not yet canceled" do
        expect {
          described_class.run(identifiers: [ order.number ], dry_run: false, io: io)
        }.to change { variant.reload.stock_quantity }.from(5).to(7)
      end

      it "cascades to order_items via dependent: :destroy" do
        described_class.run(identifiers: [ order.number ], dry_run: false, io: io)
        expect(OrderItem.exists?(item.id)).to be false
      end

      it "cascades to order_status_histories" do
        OrderStatusHistory.create!(order: order, status: "paid", title: "Pago")
        expect {
          described_class.run(identifiers: [ order.number ], dry_run: false, io: io)
        }.to change { OrderStatusHistory.where(order_id: order.id).count }.from(1).to(0)
      end

      it "destroys the linked coupon_usage (has_one cascade)" do
        coupon = create(:coupon)
        usage  = CouponUsage.create!(coupon: coupon, order: order, email: order.customer_email, discount_amount_cents: 100)
        described_class.run(identifiers: [ order.number ], dry_run: false, io: io)
        expect(CouponUsage.exists?(usage.id)).to be false
      end
    end

    context "edge cases" do
      it "reports missing identifiers without raising" do
        result = described_class.run(identifiers: [ "AND-DOES-NOT-EXIST" ], io: io)
        expect(result.found).to eq(0)
        expect(result.missing).to eq([ "AND-DOES-NOT-EXIST" ])
        expect(io.string).to include("Missing:")
      end

      it "accepts numeric ids interchangeably with order numbers" do
        order = create(:order)
        result = described_class.run(identifiers: [ order.id.to_s ], io: io)
        expect(result.found).to eq(1)
      end

      it "does not double-credit stock for already-canceled items" do
        product = create(:product)
        variant = create(:product_variant, product: product, stock_quantity: 5)
        order   = create(:order)
        create(:order_item,
               order:             order,
               product_variant:   variant,
               product:           product,
               quantity:          2,
               production_status: :canceled)

        expect {
          described_class.run(identifiers: [ order.number ], dry_run: false, io: io)
        }.not_to change { variant.reload.stock_quantity }
      end

      it "skips stock restore for made_to_order items (stock was never deducted)" do
        product = create(:product, :made_to_order)
        variant = create(:product_variant, product: product, stock_quantity: 0)
        order   = create(:order)
        create(:order_item, order: order, product_variant: variant, product: product, quantity: 3)

        expect {
          described_class.run(identifiers: [ order.number ], dry_run: false, io: io)
        }.not_to change { variant.reload.stock_quantity }
      end

      it "rolls back ALL changes if one order in the batch fails" do
        good = create(:order)
        create(:order_item, order: good)
        bad  = create(:order)
        # Force destroy! to fail on the second order by stubbing.
        allow(Order).to receive(:where).and_call_original
        original_destroy = bad.method(:destroy!)
        allow_any_instance_of(Order).to receive(:destroy!) do |o|
          raise ActiveRecord::RecordNotDestroyed.new("boom", o) if o.id == bad.id
          original_destroy.call if o.id == good.id
        end

        expect {
          described_class.run(identifiers: [ good.number, bad.number ], dry_run: false, io: io)
        }.to raise_error(ActiveRecord::RecordNotDestroyed)

        expect(Order.exists?(good.id)).to be true
        expect(Order.exists?(bad.id)).to  be true
      end
    end
  end
end
