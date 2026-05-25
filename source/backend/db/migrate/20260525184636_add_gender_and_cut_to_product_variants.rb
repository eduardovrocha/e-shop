class AddGenderAndCutToProductVariants < ActiveRecord::Migration[7.2]
  # Adds two new attributes per variant so a single product can carry
  # masculine/feminine cuts side-by-side (e.g. a "Camiseta da Romaria"
  # with masculino-normal-M and feminino-babylook-M as separate SKUs).
  #
  # Defaults backfill existing rows with 'unissex' / 'normal' so the
  # storefront keeps working without manual touch-ups.
  def change
    add_column :product_variants, :gender, :string, null: false, default: 'unissex'
    add_column :product_variants, :cut,    :string, null: false, default: 'normal'

    add_index :product_variants, [ :product_id, :gender ]
    add_index :product_variants, [ :product_id, :cut    ]
  end
end
