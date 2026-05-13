class AddIndexToOrdersCreatedAt < ActiveRecord::Migration[7.2]
  def change
    add_index :orders, :created_at
  end
end
