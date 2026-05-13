class CreateShippingCarriers < ActiveRecord::Migration[7.2]
  def change
    create_table :shipping_carriers do |t|
      t.integer :me_service_id,    null: false
      t.string  :name,             null: false
      t.string  :company,          null: false
      t.boolean :enabled,          null: false, default: true
      t.integer :extra_days,       null: false, default: 0
      t.integer :extra_margin_pct, null: false, default: 0
      t.integer :min_value_cents,  null: false, default: 0
      t.integer :max_value_cents
      t.integer :free_above_cents

      t.timestamps
    end

    add_index :shipping_carriers, :me_service_id, unique: true
    add_index :shipping_carriers, :enabled
  end
end
