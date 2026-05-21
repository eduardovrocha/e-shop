class CreateCouponUsages < ActiveRecord::Migration[7.2]
  def change
    create_table :coupon_usages do |t|
      t.references :coupon, null: false, foreign_key: true
      # coupon_code_id is nullable — only set when redeeming a code_type='unique' coupon
      t.references :coupon_code, foreign_key: true
      t.string :email, null: false
      t.references :order, null: false, foreign_key: true
      t.integer :discount_amount_cents, null: false
      t.datetime :created_at, null: false
    end

    add_index :coupon_usages, %i[coupon_id email]
    # 1 cupom por pedido — garante via unique index, race-safe no nível do DB
    add_index :coupon_usages, :order_id, unique: true,
              name: "idx_coupon_usages_one_per_order"
    add_check_constraint :coupon_usages,
      "discount_amount_cents > 0",
      name: "chk_coupon_usages_discount_amount_positive"
  end
end
