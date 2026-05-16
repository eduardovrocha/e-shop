class AddPromisedCompletionDateToOrders < ActiveRecord::Migration[7.2]
  def change
    add_column :orders, :promised_completion_date, :date
  end
end
