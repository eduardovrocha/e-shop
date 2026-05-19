class AddPaymentMethodFieldsToOrders < ActiveRecord::Migration[7.2]
  def change
    add_column :orders, :payment_brand, :string
    add_column :orders, :payment_last4, :string, limit: 4
  end
end
