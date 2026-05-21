class Coupon < ApplicationRecord
  CODE_TYPES  = %w[public unique].freeze
  SCOPE_TYPES = %w[all_products specific_products].freeze

  # Fields that cannot be edited once any CouponUsage exists. Mutating them
  # after a usage would change the meaning of the historical redemption —
  # the snapshot lives on Order, so the historical record stays intact, but
  # admin intent could still cause surprise. Block at the model layer.
  IMMUTABLE_FIELDS_AFTER_USAGE = %w[
    discount_percent
    code_type
    public_code
    scope_type
    applies_to_sale_items
  ].freeze

  has_many :coupon_products, dependent: :destroy
  has_many :products, through: :coupon_products
  has_many :coupon_codes,  dependent: :destroy
  has_many :coupon_usages, dependent: :restrict_with_error

  validates :name, presence: true
  validates :discount_percent,
            numericality: { only_integer: true, in: 1..100 }
  validates :code_type,  inclusion: { in: CODE_TYPES }
  validates :scope_type, inclusion: { in: SCOPE_TYPES }
  validates :public_code, presence:   true,
                          uniqueness: { case_sensitive: false },
                          if:        :public_code_required?
  validates :public_code, absence: true, if: :public_code_forbidden?
  validate :expires_after_starts
  validate :immutable_fields_unchanged_after_usage, on: :update

  before_validation :normalize_public_code

  scope :active_now, lambda {
    now = Time.current
    where(active: true)
      .where("starts_at IS NULL OR starts_at <= ?", now)
      .where("expires_at IS NULL OR expires_at >= ?", now)
  }

  def within_validity_window?
    now = Time.current
    (starts_at.blank? || starts_at <= now) &&
      (expires_at.blank? || expires_at >= now)
  end

  def usages_count
    coupon_usages.count
  end

  def usages_count_for(email)
    normalized = email.to_s.downcase.strip
    coupon_usages.where(email: normalized).count
  end

  def usage_limit_reached?
    return false if total_usage_limit.blank?
    usages_count >= total_usage_limit
  end

  def per_customer_limit_reached_for?(email)
    return false if per_customer_limit.blank?
    usages_count_for(email) >= per_customer_limit
  end

  # Aggregate status — derived, not stored. The admin UI uses this in the
  # list view; orders never read it (they use snapshot fields).
  def derived_status
    return "inactive"  unless active
    return "expired"   if expires_at.present? && expires_at < Time.current
    return "scheduled" if starts_at.present? && starts_at > Time.current
    return "exhausted" if usage_limit_reached?
    "active"
  end

  private

  def public_code_required?
    code_type == "public"
  end

  def public_code_forbidden?
    code_type == "unique"
  end

  def normalize_public_code
    self.public_code = public_code.to_s.strip.upcase.presence
  end

  def expires_after_starts
    return if starts_at.blank? || expires_at.blank?
    return if expires_at > starts_at
    errors.add(:expires_at, "deve ser após starts_at")
  end

  def immutable_fields_unchanged_after_usage
    return if coupon_usages.none?

    IMMUTABLE_FIELDS_AFTER_USAGE.each do |field|
      next unless changed.include?(field)
      errors.add(field.to_sym, "não pode ser alterado após o primeiro uso do cupom")
    end
  end
end
