class AddTrackingFieldsToOrders < ActiveRecord::Migration[7.2]
  def change
    add_column :orders, :number,           :string
    add_column :orders, :tracking_token,   :string, null: false, default: ''
    add_column :orders, :tracking_code,    :string
    add_column :orders, :notes,            :text
    add_column :orders, :carrier,          :string
    add_column :orders, :shipping_service, :string
    add_column :orders, :estimated_delivery, :date

    add_index :orders, :tracking_token, unique: true
    add_index :orders, :number,         unique: true, where: "number IS NOT NULL"
  end
end
