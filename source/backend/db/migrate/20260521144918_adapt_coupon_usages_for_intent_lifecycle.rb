# The Andrequicé checkout creates Stripe::PaymentIntent BEFORE the Order
# is persisted — the Order is materialized later in the webhook handler.
# To reserve a coupon slot atomically at create_intent time (race-safe), we
# need a CouponUsage row that can exist without an Order yet. The link is
# upgraded once the success webhook arrives.
class AdaptCouponUsagesForIntentLifecycle < ActiveRecord::Migration[7.2]
  def change
    change_column_null :coupon_usages, :order_id, true

    add_column :coupon_usages, :stripe_intent_id, :string
    add_index :coupon_usages, :stripe_intent_id, unique: true,
              where: "stripe_intent_id IS NOT NULL"

    # Either the usage references an Order (finalized) or holds a Stripe
    # intent reservation (in-flight) — never neither, never both blank.
    add_check_constraint :coupon_usages,
      "order_id IS NOT NULL OR stripe_intent_id IS NOT NULL",
      name: "chk_coupon_usages_order_or_intent"
  end
end
