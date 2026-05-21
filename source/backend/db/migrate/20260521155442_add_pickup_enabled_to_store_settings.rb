class AddPickupEnabledToStoreSettings < ActiveRecord::Migration[7.2]
  def change
    add_column :store_settings, :pickup_enabled, :boolean, null: false, default: true
  end
end
