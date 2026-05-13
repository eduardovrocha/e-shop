class Product < ApplicationRecord
  has_many :variants, class_name: "ProductVariant", dependent: :destroy
  has_many_attached :images

  accepts_nested_attributes_for :variants, allow_destroy: true, reject_if: :all_blank

  CATEGORIES = %w[camisetas acessorios kits outros].freeze
  MAX_IMAGES  = 10
  MAX_SIZE    = 5.megabytes
  ALLOWED_CONTENT_TYPES = %w[image/jpeg image/png image/webp].freeze

  before_validation :generate_slug, if: -> { slug.blank? }

  validates :name,        presence: true
  validates :price_cents, numericality: { greater_than: 0 }
  validates :slug,        presence: true, uniqueness: true

  scope :active,          -> { where(active: true) }
  scope :inactive,        -> { where(active: false) }
  scope :with_dimensions, -> { where.not(weight_g: nil, height_mm: nil, width_mm: nil, length_mm: nil) }

  validates :weight_g,  numericality: { greater_than: 0, allow_nil: true }
  validates :height_mm, numericality: { greater_than: 0, allow_nil: true }
  validates :width_mm,  numericality: { greater_than: 0, allow_nil: true }
  validates :length_mm, numericality: { greater_than: 0, allow_nil: true }

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
