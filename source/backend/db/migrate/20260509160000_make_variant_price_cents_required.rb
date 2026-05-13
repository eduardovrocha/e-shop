class MakeVariantPriceCentsRequired < ActiveRecord::Migration[7.2]
  def up
    # Backfill any variants that have no explicit price from their product's base price
    execute <<~SQL
      UPDATE product_variants v
      SET    price_cents = p.price_cents
      FROM   products p
      WHERE  v.product_id = p.id
        AND  v.price_cents IS NULL
    SQL

    # Drop the old nullable-aware check constraint
    remove_check_constraint :product_variants,
                            name: "chk_product_variants_price_cents_non_negative"

    # Enforce NOT NULL and a clean non-negative constraint
    change_column_null :product_variants, :price_cents, false
    add_check_constraint :product_variants,
                         "price_cents >= 0",
                         name: "chk_product_variants_price_cents_non_negative"
  end

  def down
    remove_check_constraint :product_variants,
                            name: "chk_product_variants_price_cents_non_negative"
    change_column_null :product_variants, :price_cents, true
    add_check_constraint :product_variants,
                         "price_cents IS NULL OR price_cents >= 0",
                         name: "chk_product_variants_price_cents_non_negative"
  end
end
