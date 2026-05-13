class AddPriceCentsToProductVariants < ActiveRecord::Migration[7.2]
  def change
    add_column :product_variants, :price_cents, :integer, null: true, default: nil
    add_check_constraint :product_variants, "price_cents IS NULL OR price_cents >= 0", name: "chk_product_variants_price_cents_non_negative"
  end
end
