class CreateProducts < ActiveRecord::Migration[7.2]
  def change
    create_table :products do |t|
      t.string  :name,         null: false
      t.text    :description
      t.integer :price_cents,  null: false
      t.string  :category
      t.string  :slug,         null: false
      t.boolean :active,       null: false, default: true
      t.jsonb   :images,       null: false, default: []
      t.timestamps
    end
    add_index :products, :slug,   unique: true
    add_index :products, :active
  end
end
