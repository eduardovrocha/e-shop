class AddCompareAtPriceCentsToProducts < ActiveRecord::Migration[7.2]
  def change
    add_column :products, :compare_at_price_cents, :integer
    add_check_constraint :products,
      "compare_at_price_cents IS NULL OR compare_at_price_cents >= 0",
      name: "chk_products_compare_at_price_cents_non_negative"
  end
end
