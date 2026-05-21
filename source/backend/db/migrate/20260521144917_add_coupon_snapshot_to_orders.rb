class AddCouponSnapshotToOrders < ActiveRecord::Migration[7.2]
  def change
    # Snapshot columns — preserved on the order even if the coupon is later
    # deleted, edited or deactivated. Decoupled from the coupons table so
    # historical orders remain readable.
    add_reference :orders, :coupon, foreign_key: true
    add_column :orders, :coupon_code_used,         :string
    add_column :orders, :discount_percent_applied, :integer
    add_column :orders, :discount_amount_cents,    :integer

    add_check_constraint :orders,
      "discount_amount_cents IS NULL OR discount_amount_cents >= 0",
      name: "chk_orders_discount_amount_cents_non_negative"
    add_check_constraint :orders,
      "discount_percent_applied IS NULL OR discount_percent_applied BETWEEN 1 AND 100",
      name: "chk_orders_discount_percent_applied_range"
  end
end
