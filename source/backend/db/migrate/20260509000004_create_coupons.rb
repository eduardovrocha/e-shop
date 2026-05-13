class CreateCoupons < ActiveRecord::Migration[7.2]
  def change
    create_table :coupons do |t|
      t.string  :code,           null: false
      t.string  :discount_type,  null: false
      t.decimal :discount_value, null: false, precision: 10, scale: 2
      t.integer :minimum_order_cents
      t.datetime :expires_at
      t.integer  :usage_limit
      t.integer  :used_count,   null: false, default: 0
      t.boolean  :active,       null: false, default: true
      t.timestamps
    end
    add_index :coupons, :code, unique: true
  end
end
