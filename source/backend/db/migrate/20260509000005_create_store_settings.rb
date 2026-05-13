class CreateStoreSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :store_settings do |t|
      t.string  :event_name,               default: "Festa de Andrequicé", null: false
      t.string  :edition,                  default: "2025",                null: false
      t.string  :contact_email,            default: "",                    null: false
      t.text    :pickup_address,           default: "",                    null: false
      t.string  :whatsapp_number,          default: "",                    null: false
      t.integer :free_shipping_above_cents, default: 15_000,               null: false
      t.integer :shipping_fee_cents,        default: 1_500,                null: false

      t.timestamps
    end
  end
end
