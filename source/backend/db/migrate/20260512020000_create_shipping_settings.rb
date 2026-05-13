class CreateShippingSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :shipping_settings do |t|
      # Origem / Remetente
      t.string  :origin_zipcode,  null: false, default: ""
      t.string  :sender_name,     null: false, default: ""
      t.string  :sender_phone,    null: false, default: ""
      t.string  :sender_address,  null: false, default: ""
      t.string  :sender_number,   null: false, default: ""
      t.string  :sender_city,     null: false, default: ""
      t.string  :sender_state,    null: false, default: ""

      # Melhor Envio credentials (tokens armazenados criptografados)
      t.string  :me_client_id,     null: false, default: ""
      t.text    :me_client_secret
      t.text    :me_access_token
      t.text    :me_refresh_token
      t.boolean :me_sandbox,       null: false, default: true

      # Regras globais
      t.boolean :free_shipping_enabled,     null: false, default: false
      t.integer :free_shipping_above_cents, null: false, default: 0
      t.boolean :local_pickup_enabled,      null: false, default: false
      t.integer :global_extra_days,         null: false, default: 0
      t.integer :global_extra_margin_pct,   null: false, default: 0

      t.timestamps
    end
  end
end
