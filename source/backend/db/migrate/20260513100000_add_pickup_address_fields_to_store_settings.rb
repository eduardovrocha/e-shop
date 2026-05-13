class AddPickupAddressFieldsToStoreSettings < ActiveRecord::Migration[7.2]
  def change
    add_column :store_settings, :pickup_zipcode,    :string, default: "", null: false
    add_column :store_settings, :pickup_street,     :string, default: "", null: false
    add_column :store_settings, :pickup_number,     :string, default: "", null: false
    add_column :store_settings, :pickup_complement, :string, default: "", null: false
    add_column :store_settings, :pickup_city,       :string, default: "", null: false
    add_column :store_settings, :pickup_state,      :string, default: "", null: false
  end
end
