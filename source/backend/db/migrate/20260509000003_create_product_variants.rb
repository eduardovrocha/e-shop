class CreateProductVariants < ActiveRecord::Migration[7.2]
  def change
    create_table :product_variants do |t|
      t.references :product,             null: false, foreign_key: true
      t.string  :size
      t.string  :color
      t.string  :sku,                    null: false
      t.integer :stock_quantity,         null: false, default: 0
      t.integer :additional_price_cents, null: false, default: 0
      t.timestamps
    end
    add_index :product_variants, :sku, unique: true
  end
end
