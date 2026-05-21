class CouponUsage < ApplicationRecord
  belongs_to :coupon
  belongs_to :coupon_code, optional: true # only set for code_type='unique' redemptions
  belongs_to :order, optional: true # attached on the success webhook

  validates :email, presence: true
  validates :order_id, uniqueness: true, allow_nil: true
  validates :stripe_intent_id, uniqueness: true, allow_nil: true
  validates :discount_amount_cents,
            numericality: { only_integer: true, greater_than: 0 }
  validate :order_or_intent_present

  before_validation :normalize_email

  scope :finalized,    -> { where.not(order_id: nil) }
  scope :reservations, -> { where(order_id: nil).where.not(stripe_intent_id: nil) }

  private

  def normalize_email
    self.email = email.to_s.downcase.strip.presence
  end

  def order_or_intent_present
    return if order_id.present? || stripe_intent_id.present?
    errors.add(:base, "deve referenciar uma Order ou um stripe_intent_id")
  end
end
