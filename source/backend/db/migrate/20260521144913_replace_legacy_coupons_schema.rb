# The legacy coupons schema (migration 20260509000004) was scaffolded but
# never wired up — its controller is unreferenced and the dashboard route
# stays commented out. We drop the legacy table and recreate `coupons` with
# the schema this feature actually needs. No data preservation: the legacy
# table has zero production rows by design (feature was never released).
class ReplaceLegacyCouponsSchema < ActiveRecord::Migration[7.2]
  def up
    drop_table :coupons, if_exists: true

    create_table :coupons do |t|
      t.string  :name,             null: false
      t.integer :discount_percent, null: false
      t.boolean :applies_to_sale_items, null: false, default: false
      t.string  :code_type,        null: false # 'public' | 'unique'
      t.string  :public_code
      t.string  :scope_type,       null: false # 'all_products' | 'specific_products'
      t.datetime :starts_at
      t.datetime :expires_at
      t.integer :total_usage_limit
      t.integer :per_customer_limit
      t.boolean :active, null: false, default: true
      t.timestamps
    end

    add_index :coupons, :public_code, unique: true, where: "public_code IS NOT NULL"
    add_index :coupons, :active
    add_check_constraint :coupons,
      "discount_percent BETWEEN 1 AND 100",
      name: "chk_coupons_discount_percent_range"
    add_check_constraint :coupons,
      "code_type IN ('public','unique')",
      name: "chk_coupons_code_type"
    add_check_constraint :coupons,
      "scope_type IN ('all_products','specific_products')",
      name: "chk_coupons_scope_type"
  end

  def down
    drop_table :coupons

    create_table :coupons do |t|
      t.string   :code,           null: false
      t.string   :discount_type,  null: false
      t.decimal  :discount_value, null: false, precision: 10, scale: 2
      t.integer  :minimum_order_cents
      t.datetime :expires_at
      t.integer  :usage_limit
      t.integer  :used_count, null: false, default: 0
      t.boolean  :active,     null: false, default: true
      t.timestamps
    end
    add_index :coupons, :code, unique: true
  end
end
