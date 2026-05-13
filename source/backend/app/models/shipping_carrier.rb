class ShippingCarrier < ApplicationRecord
  validates :me_service_id, presence: true, uniqueness: true
  validates :name, :company, presence: true
  validates :extra_days,       numericality: { greater_than_or_equal_to: 0 }
  validates :extra_margin_pct, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :min_value_cents,  numericality: { greater_than_or_equal_to: 0 }

  scope :enabled, -> { where(enabled: true) }

  def display_name
    "#{company} #{name}".strip
  end
end
