require "rails_helper"

RSpec.describe Production::AdvanceQueueJob, type: :job do
  let(:product) do
    create(:product, :made_to_order, production_capacity: 3, production_lead_time_days: 14)
  end
  let(:variant) { create(:product_variant, product: product) }
  let(:order)   { create(:order) }

  def create_item(status:)
    create(:order_item, order: order, product_variant: variant, product: product,
                        production_status: status)
  end

  describe "#perform" do
    it "promotes paid items up to the production capacity" do
      3.times { create_item(status: :paid) }

      described_class.new.perform(product.id)

      expect(product.order_items.where(production_status: :in_production).count).to eq(3)
      expect(product.order_items.where(production_status: :paid).count).to eq(0)
    end

    it "is a no-op when capacity is fully booked" do
      3.times { create_item(status: :in_production) }
      paid = create_item(status: :paid)

      described_class.new.perform(product.id)

      expect(paid.reload.production_status).to eq("paid")
    end

    it "promotes only what fits when capacity is partially used" do
      2.times { create_item(status: :in_production) }
      paid_items = Array.new(5) { create_item(status: :paid) }

      described_class.new.perform(product.id)

      in_prod = product.order_items.where(production_status: :in_production).count
      expect(in_prod).to eq(3)
      promoted_count = paid_items.count { |i| i.reload.production_status == "in_production" }
      expect(promoted_count).to eq(1)
    end

    it "does not exceed capacity when invoked twice in a row (idempotent)" do
      Array.new(5) { create_item(status: :paid) }

      described_class.new.perform(product.id)
      described_class.new.perform(product.id)

      expect(product.order_items.where(production_status: :in_production).count).to eq(3)
    end

    it "is a no-op for from_stock products (early return)" do
      product.update!(fulfillment_mode: :from_stock,
                      production_lead_time_days: nil,
                      production_capacity: nil,
                      cancellation_refund_percentage: nil)
      paid = create_item(status: :paid)

      described_class.new.perform(product.id)

      expect(paid.reload.production_status).to eq("paid")
    end

    it "promotes in FIFO order (oldest paid first)" do
      older = create_item(status: :paid)
      older.update_columns(created_at: 2.days.ago)
      newer = create_item(status: :paid)
      newer.update_columns(created_at: 1.hour.ago)

      product.update!(production_capacity: 1)
      described_class.new.perform(product.id)

      expect(older.reload.production_status).to eq("in_production")
      expect(newer.reload.production_status).to eq("paid")
    end
  end
end
