class CreateOrders < ActiveRecord::Migration[7.2]
  def change
    create_table :orders do |t|
      t.string   :stripe_intent_id,   null: false
      t.string   :customer_name
      t.string   :customer_email
      t.string   :customer_phone
      t.string   :delivery_method,    null: false, default: "pickup"
      t.integer  :items_total_cents,  null: false
      t.integer  :shipping_fee_cents, null: false, default: 0
      t.integer  :total_cents,        null: false
      t.string   :status,             null: false, default: "pending"
      t.jsonb    :items,              null: false, default: []
      t.jsonb    :shipping_address
      t.timestamps
    end

    add_index :orders, :stripe_intent_id, unique: true
    add_index :orders, :status
    add_index :orders, :customer_email
  end
end
