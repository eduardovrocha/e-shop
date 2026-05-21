class CouponProduct < ApplicationRecord
  belongs_to :coupon
  belongs_to :product

  validates :product_id, uniqueness: { scope: :coupon_id }
end
