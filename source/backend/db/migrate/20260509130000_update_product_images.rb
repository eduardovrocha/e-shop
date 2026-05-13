class UpdateProductImages < ActiveRecord::Migration[7.2]
  def change
    remove_column :products, :images, :jsonb
    add_column :products, :image_order, :jsonb, default: [], null: false
  end
end
