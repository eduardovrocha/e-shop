class ProductVariant < ApplicationRecord
  belongs_to :product

  SIZES   = %w[PP P M G GG GGG U].freeze
  GENDERS = %w[unissex masculino feminino].freeze
  # Cut/fit dimension complements size — same product can have, e.g.,
  # masculino-normal-M and feminino-babylook-M as distinct SKUs.
  CUTS    = %w[normal babylook polo regata oversized].freeze

  validates :sku,               presence: true, uniqueness: true
  validates :stock_quantity,    numericality: { greater_than_or_equal_to: 0 }
  validates :reserved_quantity, numericality: { greater_than_or_equal_to: 0 }
  validates :price_cents,       presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :compare_at_price_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            allow_nil: true
  validates :gender, inclusion: { in: GENDERS }
  validates :cut,    inclusion: { in: CUTS    }
  validates :unit_cost_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            allow_nil: true

  # When admin sets/changes variant-level cost, fill linked order_items
  # whose snapshot is null. Variant override has priority over the
  # product-level fallback.
  after_save :backfill_null_order_item_costs, if: :saved_change_to_unit_cost_cents?

  def backfill_null_order_item_costs
    OrderItemCostBackfiller.from_variant(self)
  end

  # Treats compare_at == price (or compare_at < price) as "no promo" by
  # nullifying the column. Rejecting it with a validation error rolled
  # back the whole product update — that one mistake on a single size
  # was preventing the other sizes from being saved at all. Nullifying
  # is the semantically-correct behavior: a promo is by definition a
  # discount, so when compare <= price the variant simply isn't on sale.
  before_validation :clear_compare_when_not_promo

  scope :low_stock,    -> { where("stock_quantity > 0 AND stock_quantity <= 5") }
  scope :out_of_stock, -> { where(stock_quantity: 0) }

  # Price is always explicit per variant — no fallback to product.price_cents
  def effective_price_cents
    price_cents
  end

  # Promo "de" price for this variant. Falls back to product.compare_at_price_cents
  # so a store-wide promo configured at the Product level still applies to
  # variants that don't set their own. Returns nil when nothing is on promo.
  def effective_compare_at_price_cents
    compare_at_price_cents.presence || product&.compare_at_price_cents
  end

  def on_sale?
    effective_compare_at_price_cents.present? &&
      effective_compare_at_price_cents > price_cents
  end

  # Variant override OR product fallback for production cost. nil when
  # neither side has the data — admin hasn't filled it in yet. Mirrors
  # effective_compare_at_price_cents both in name and in semantics.
  def effective_unit_cost_cents
    unit_cost_cents.presence || product&.unit_cost_cents
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

  private

  def clear_compare_when_not_promo
    return if compare_at_price_cents.blank?
    return if price_cents.blank?
    return if compare_at_price_cents > price_cents
    self.compare_at_price_cents = nil
  end

  public

  InsufficientStockError = Class.new(StandardError) do
    attr_reader :variant, :requested

    def initialize(variant, requested)
      @variant   = variant
      @requested = requested
      super("Estoque insuficiente: #{variant.product.name} (#{variant.size}) — disponível #{variant.available_quantity}, solicitado #{requested}")
    end
  end
end
