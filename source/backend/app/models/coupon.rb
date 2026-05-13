class Coupon < ApplicationRecord
  DISCOUNT_TYPES = %w[percentage fixed].freeze

  validates :code,           presence: true, uniqueness: { case_sensitive: false }
  validates :discount_type,  inclusion: { in: DISCOUNT_TYPES }
  validates :discount_value, numericality: { greater_than: 0 }
  validates :used_count,     numericality: { greater_than_or_equal_to: 0 }

  before_validation { code&.upcase! }

  scope :active,    -> { where(active: true) }
  scope :expired,   -> { where("expires_at IS NOT NULL AND expires_at < ?", Time.current) }
  scope :valid_now, -> { active.where("expires_at IS NULL OR expires_at >= ?", Time.current) }

  def increment_usage!
    increment!(:used_count)
    update!(active: false) if usage_limit && used_count >= usage_limit
  end
end
