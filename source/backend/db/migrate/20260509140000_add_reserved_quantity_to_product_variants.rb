class AddReservedQuantityToProductVariants < ActiveRecord::Migration[7.2]
  def change
    add_column :product_variants, :reserved_quantity, :integer, null: false, default: 0
    add_index  :product_variants, :stock_quantity
  end
end
