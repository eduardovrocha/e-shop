class CreateCouponCodes < ActiveRecord::Migration[7.2]
  def change
    create_table :coupon_codes do |t|
      t.references :coupon, null: false, foreign_key: true
      t.string :code, null: false
      t.timestamps
    end

    add_index :coupon_codes, :code, unique: true
  end
end
