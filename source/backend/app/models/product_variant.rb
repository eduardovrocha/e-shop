class ProductVariant < ApplicationRecord
  belongs_to :product

  SIZES = %w[PP P M G GG GGG U].freeze

  validates :sku,               presence: true, uniqueness: true
  validates :stock_quantity,    numericality: { greater_than_or_equal_to: 0 }
  validates :reserved_quantity, numericality: { greater_than_or_equal_to: 0 }
  validates :price_cents,       presence: true, numericality: { greater_than_or_equal_to: 0 }

  scope :low_stock,    -> { where("stock_quantity > 0 AND stock_quantity <= 5") }
  scope :out_of_stock, -> { where(stock_quantity: 0) }

  # Price is always explicit per variant — no fallback to product.price_cents
  def effective_price_cents
    price_cents
  end

  def price
    price_cents / 100.0
  end

  def available_quantity
    [ stock_quantity - reserved_quantity, 0 ].max
  end

  def decrement_stock!(qty)
    with_lock do
      raise InsufficientStockError.new(self, qty) if available_quantity < qty
      decrement!(:stock_quantity, qty)
    end
  end

  InsufficientStockError = Class.new(StandardError) do
    attr_reader :variant, :requested

    def initialize(variant, requested)
      @variant   = variant
      @requested = requested
      super("Estoque insuficiente: #{variant.product.name} (#{variant.size}) — disponível #{variant.available_quantity}, solicitado #{requested}")
    end
  end
end
