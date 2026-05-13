class Order < ApplicationRecord
  STATUSES = %w[
    pending paid failed disputed cancelled
    processing producing packed shipped out_for_delivery delivered refunded
  ].freeze

  VALID_TRANSITIONS = {
    "pending"          => %w[paid failed cancelled],
    "paid"             => %w[processing cancelled refunded disputed],
    "processing"       => %w[producing packed cancelled],
    "producing"        => %w[packed cancelled],
    "packed"           => %w[shipped cancelled],
    "shipped"          => %w[out_for_delivery delivered],
    "out_for_delivery" => %w[delivered failed],
    "delivered"        => %w[refunded disputed],
    "failed"           => %w[pending cancelled],
    "disputed"         => %w[refunded cancelled],
    "cancelled"        => %w[],
    "refunded"         => %w[]
  }.freeze

  DELIVERY_METHODS = %w[delivery pickup].freeze

  has_many :status_histories, class_name: "OrderStatusHistory",
                               dependent: :destroy, inverse_of: :order

  validates :stripe_intent_id,  presence: true, uniqueness: true
  validates :status,            inclusion: { in: STATUSES }
  validates :delivery_method,   inclusion: { in: DELIVERY_METHODS }
  validates :tracking_token,    presence: true, uniqueness: true
  validates :items_total_cents, :shipping_fee_cents, :total_cents,
            numericality: { greater_than_or_equal_to: 0 }

  before_validation :ensure_tracking_token
  after_create      :assign_number

  scope :paid,    -> { where(status: "paid") }
  scope :pending, -> { where(status: "pending") }

  def paid?
    status == "paid"
  end

  def total_brl
    total_cents / 100.0
  end

  def public_tracking_url
    host = ENV.fetch("HOST_URL", "http://localhost").sub(/\/$/, "")
    "#{host}/track/#{tracking_token}"
  end

  private

  def ensure_tracking_token
    return if tracking_token.present?
    self.tracking_token = loop do
      token = SecureRandom.urlsafe_base64(16)
      break token unless Order.exists?(tracking_token: token)
    end
  end

  def assign_number
    update_column(:number, "AND-#{id.to_s.rjust(6, '0')}")
  end
end
