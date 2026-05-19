class AddInstallmentCountToOrders < ActiveRecord::Migration[7.2]
  def change
    add_column :orders, :installment_count, :integer
  end
end
