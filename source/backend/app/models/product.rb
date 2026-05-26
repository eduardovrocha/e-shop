class Product < ApplicationRecord
  has_many :variants, class_name: "ProductVariant", dependent: :destroy
  has_many :order_items
  has_many_attached :images

  accepts_nested_attributes_for :variants, allow_destroy: true, reject_if: :all_blank

  CATEGORIES = %w[camisetas acessorios kits outros].freeze
  MAX_IMAGES  = 10
  MAX_SIZE    = 5.megabytes
  ALLOWED_CONTENT_TYPES = %w[image/jpeg image/png image/webp].freeze

  enum fulfillment_mode: { from_stock: 0, made_to_order: 1 }

  before_validation :generate_slug, if: -> { slug.blank? }

  validates :name,        presence: true
  validates :price_cents, numericality: { greater_than: 0 }
  validates :slug,        presence: true, uniqueness: true

  with_options if: :made_to_order? do
    validates :production_lead_time_days, presence: true,
              numericality: { only_integer: true, greater_than: 0 }
    validates :production_capacity, presence: true,
              numericality: { only_integer: true, greater_than: 0 }
    validates :cancellation_refund_percentage, presence: true,
              numericality: { only_integer: true,
                              greater_than_or_equal_to: 0,
                              less_than_or_equal_to: 100 }
  end

  scope :active,          -> { where(active: true) }
  scope :inactive,        -> { where(active: false) }
  scope :with_dimensions, -> { where.not(weight_g: nil, height_mm: nil, width_mm: nil, length_mm: nil) }

  validates :weight_g,  numericality: { greater_than: 0, allow_nil: true }
  validates :height_mm, numericality: { greater_than: 0, allow_nil: true }
  validates :width_mm,  numericality: { greater_than: 0, allow_nil: true }
  validates :length_mm, numericality: { greater_than: 0, allow_nil: true }
  # Production cost in cents — admin-only, used as the fallback for any
  # variant without its own unit_cost_cents. Nullable so the UI can flag
  # "cost not yet defined" instead of silently treating it as zero.
  validates :unit_cost_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            allow_nil: true

  # When the admin sets/changes the product cost, retroactively fill any
  # order_items that have NEVER had a cost snapshot (unit_cost_cents IS
  # NULL). Items with a snapshot are left alone — snapshot is the source
  # of truth post-purchase. Solves the bootstrap gap when admin enters
  # costs after items are already in the DB.
  after_save :backfill_null_order_item_costs, if: :saved_change_to_unit_cost_cents?

  def backfill_null_order_item_costs
    OrderItemCostBackfiller.from_product(self)
  end

  def has_dimensions?
    weight_g.present? && height_mm.present? && width_mm.present? && length_mm.present?
  end

  def weight_kg
    return nil unless weight_g
    weight_g / 1000.0
  end

  def height_cm
    return nil unless height_mm
    height_mm / 10.0
  end

  def width_cm
    return nil unless width_mm
    width_mm / 10.0
  end

  def length_cm
    return nil unless length_mm
    length_mm / 10.0
  end

  def ordered_images
    blobs = images.blobs.to_a
    return blobs if image_order.blank?
    ordered   = image_order.filter_map { |id| blobs.find { |b| b.id == id } }
    remaining = blobs.reject { |b| image_order.include?(b.id) }
    ordered + remaining
  end

  def total_stock
    variants.sum { |v| v.available_quantity }
  end

  # Returns the estimated number of days from order placement to completion.
  # For from_stock products this is the configured lead time (or nil). For
  # made_to_order it accounts for the current production queue and capacity:
  # each "wave" of `production_capacity` simultaneous units takes one
  # `production_lead_time_days` window.
  def estimated_completion_days_for_new_order
    return production_lead_time_days unless made_to_order?
    return nil if production_capacity.blank? || production_lead_time_days.blank?

    queue_count = order_items
                    .where(production_status: [ :paid, :in_production ])
                    .count

    new_position = queue_count + 1
    waves        = ((new_position - 1) / production_capacity).floor
    (waves + 1) * production_lead_time_days
  end

  private

  def generate_slug
    return unless name.present?
    base = ActiveSupport::Inflector.transliterate(name)
                                   .downcase
                                   .gsub(/[^a-z0-9\s-]/, "")
                                   .gsub(/\s+/, "-")
                                   .gsub(/-+/, "-")
                                   .delete_prefix("-")
                                   .delete_suffix("-")
    candidate = base
    n = 2
    while Product.where(slug: candidate).where.not(id: id).exists?
      candidate = "#{base}-#{n}"
      n += 1
    end
    self.slug = candidate
  end
end
