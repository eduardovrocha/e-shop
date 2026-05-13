class AddDimensionsToProducts < ActiveRecord::Migration[7.2]
  def change
    add_column :products, :weight_g,  :integer, null: true, default: nil
    add_column :products, :height_mm, :integer, null: true, default: nil
    add_column :products, :width_mm,  :integer, null: true, default: nil
    add_column :products, :length_mm, :integer, null: true, default: nil

    add_check_constraint :products, "weight_g IS NULL OR weight_g > 0",   name: "chk_products_weight_g_positive"
    add_check_constraint :products, "height_mm IS NULL OR height_mm > 0", name: "chk_products_height_mm_positive"
    add_check_constraint :products, "width_mm IS NULL OR width_mm > 0",   name: "chk_products_width_mm_positive"
    add_check_constraint :products, "length_mm IS NULL OR length_mm > 0", name: "chk_products_length_mm_positive"
  end
end
