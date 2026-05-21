require "rails_helper"

RSpec.describe ProductVariant, type: :model do
  describe "validations" do
    it { is_expected.to belong_to(:product) }
    it { is_expected.to validate_presence_of(:sku) }
    it { is_expected.to validate_numericality_of(:stock_quantity).is_greater_than_or_equal_to(0) }
    it { is_expected.to validate_numericality_of(:price_cents).is_greater_than_or_equal_to(0) }
  end

  describe "#available_quantity" do
    it "returns stock minus reserved" do
      variant = build(:product_variant, stock_quantity: 10, reserved_quantity: 3)
      expect(variant.available_quantity).to eq(7)
    end

    it "returns 0 when reserved exceeds stock" do
      variant = build(:product_variant, stock_quantity: 2, reserved_quantity: 5)
      expect(variant.available_quantity).to eq(0)
    end
  end

  describe "#decrement_stock!" do
    let!(:variant) { create(:product_variant, stock_quantity: 5) }

    it "reduces stock_quantity by the requested amount" do
      variant.decrement_stock!(2)
      expect(variant.reload.stock_quantity).to eq(3)
    end

    it "raises InsufficientStockError when stock is insufficient" do
      expect {
        variant.decrement_stock!(10)
      }.to raise_error(ProductVariant::InsufficientStockError, /insuficiente/i)
    end

    it "does not change stock when InsufficientStockError is raised" do
      begin
        variant.decrement_stock!(10)
      rescue ProductVariant::InsufficientStockError
        nil
      end
      expect(variant.reload.stock_quantity).to eq(5)
    end
  end

  describe "#decrement_stock! (concorrência)", :non_transactional do
    it "permite apenas um decrement bem-sucedido com 10 threads concorrentes" do
      variant = create(:product_variant, stock_quantity: 1)

      barrier = Mutex.new
      latch   = ConditionVariable.new
      ready   = 0
      go      = false
      results = Array.new(10)

      threads = 10.times.map do |i|
        Thread.new do
          ActiveRecord::Base.connection_pool.with_connection do
            barrier.synchronize { ready += 1; latch.wait(barrier) until go }
            begin
              variant.reload.decrement_stock!(1)
              results[i] = :ok
            rescue ProductVariant::InsufficientStockError
              results[i] = :insufficient
            end
          end
        end
      end

      Thread.pass while barrier.synchronize { ready } < 10
      barrier.synchronize { go = true; latch.broadcast }
      threads.each(&:join)

      expect(results.count(:ok)).to eq(1)
      expect(results.count(:insufficient)).to eq(9)
      expect(variant.reload.stock_quantity).to eq(0)
    end
  end

  describe "compare_at_price_cents normalization" do
    let(:product) { create(:product, price_cents: 1000) }

    it "nullifies compare_at when equal to price (not a promo)" do
      v = build(:product_variant, product: product, price_cents: 1500, compare_at_price_cents: 1500)
      expect(v).to be_valid
      v.save!
      expect(v.compare_at_price_cents).to be_nil
      expect(v).not_to be_on_sale
    end

    it "nullifies compare_at when below price (not a promo)" do
      v = build(:product_variant, product: product, price_cents: 2000, compare_at_price_cents: 1500)
      expect(v).to be_valid
      v.save!
      expect(v.compare_at_price_cents).to be_nil
    end

    it "keeps compare_at when strictly higher than price" do
      v = build(:product_variant, product: product, price_cents: 1500, compare_at_price_cents: 2000)
      v.save!
      expect(v.compare_at_price_cents).to eq(2000)
      expect(v).to be_on_sale
    end

    it "falls back to product.compare_at_price_cents when variant override is nil" do
      product.update!(compare_at_price_cents: 3000)
      v = create(:product_variant, product: product, price_cents: 2000)
      expect(v.effective_compare_at_price_cents).to eq(3000)
      expect(v).to be_on_sale
    end
  end
end
