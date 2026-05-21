class AddCompareAtPriceCentsToProductVariants < ActiveRecord::Migration[7.2]
  def change
    add_column :product_variants, :compare_at_price_cents, :integer
    add_check_constraint :product_variants,
      "compare_at_price_cents IS NULL OR compare_at_price_cents >= 0",
      name: "chk_product_variants_compare_at_price_cents_non_negative"
  end
end
