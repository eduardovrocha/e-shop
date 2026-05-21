class CreateCouponProducts < ActiveRecord::Migration[7.2]
  def change
    create_table :coupon_products do |t|
      t.references :coupon,  null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true
      t.timestamps
    end

    add_index :coupon_products, %i[coupon_id product_id], unique: true
  end
end
