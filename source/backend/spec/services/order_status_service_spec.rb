require "rails_helper"

RSpec.describe OrderStatusService, type: :model do
  let!(:order) { create(:order, status: "paid") }

  describe ".transition" do
    context "with a valid transition" do
      it "updates the order status and returns ok: true" do
        result = described_class.transition(order, "processing")

        expect(result[:ok]).to be true
        expect(order.reload.status).to eq("processing")
      end

      it "creates an OrderStatusHistory entry" do
        expect {
          described_class.transition(order, "processing")
        }.to change(OrderStatusHistory, :count).by(1)

        history = OrderStatusHistory.last
        expect(history.status).to eq("processing")
        expect(history.order).to eq(order)
      end

      it "enqueues a notification email job" do
        expect {
          described_class.transition(order, "processing")
        }.to have_enqueued_job(OrderStatusEmailJob)
      end
    end

    context "with an invalid status" do
      it "returns ok: false with error message" do
        result = described_class.transition(order, "nonexistent_status")

        expect(result[:ok]).to be false
        expect(result[:error]).to match(/inválido/i)
        expect(order.reload.status).to eq("paid")
      end
    end

    context "when transitioning to the same status" do
      it "returns ok: false" do
        result = described_class.transition(order, "paid")

        expect(result[:ok]).to be false
        expect(result[:error]).to match(/inalterado/i)
      end
    end

    context "with an invalid state machine transition" do
      it "returns ok: false without force" do
        result = described_class.transition(order, "shipped")

        expect(result[:ok]).to be false
        expect(result[:error]).to match(/inválida/i)
        expect(order.reload.status).to eq("paid")
      end

      it "succeeds with force: true" do
        result = described_class.transition(order, "shipped", force: true)

        expect(result[:ok]).to be true
        expect(order.reload.status).to eq("shipped")
      end
    end
  end

  describe ".transition para disputed" do
    it "transiciona paid → disputed" do
      result = described_class.transition(order, "disputed", description: "Disputa aberta")

      expect(result[:ok]).to be true
      expect(order.reload.status).to eq("disputed")
    end

    it "transiciona delivered → disputed" do
      delivered_order = create(:order, status: "delivered")
      result = described_class.transition(delivered_order, "disputed")

      expect(result[:ok]).to be true
      expect(delivered_order.reload.status).to eq("disputed")
    end

    it "transiciona disputed → refunded" do
      disputed_order = create(:order, status: "disputed")
      result = described_class.transition(disputed_order, "refunded")

      expect(result[:ok]).to be true
      expect(disputed_order.reload.status).to eq("refunded")
    end

    it "transiciona disputed → cancelled" do
      disputed_order = create(:order, status: "disputed")
      result = described_class.transition(disputed_order, "cancelled")

      expect(result[:ok]).to be true
      expect(disputed_order.reload.status).to eq("cancelled")
    end
  end

  describe ".transition em estados terminais" do
    it "bloqueia qualquer transição a partir de cancelled" do
      cancelled_order = create(:order, status: "cancelled")
      %w[paid processing refunded disputed].each do |target|
        result = described_class.transition(cancelled_order, target)
        expect(result[:ok]).to be(false), "esperava falha para cancelled → #{target}"
      end
      expect(cancelled_order.reload.status).to eq("cancelled")
    end

    it "bloqueia qualquer transição a partir de refunded" do
      refunded_order = create(:order, status: "refunded")
      %w[paid disputed cancelled].each do |target|
        result = described_class.transition(refunded_order, target)
        expect(result[:ok]).to be(false), "esperava falha para refunded → #{target}"
      end
      expect(refunded_order.reload.status).to eq("refunded")
    end

    it "permite force: true mesmo em estado terminal" do
      cancelled_order = create(:order, status: "cancelled")
      result = described_class.transition(cancelled_order, "paid", force: true)

      expect(result[:ok]).to be true
      expect(cancelled_order.reload.status).to eq("paid")
    end
  end

  describe ".record" do
    it "creates history for the current status without changing it" do
      expect {
        described_class.record(order, admin: "system")
      }.to change(OrderStatusHistory, :count).by(1)

      expect(order.reload.status).to eq("paid")
      expect(OrderStatusHistory.last.status).to eq("paid")
    end
  end
end
