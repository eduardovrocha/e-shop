class CreateReleaseExecutions < ActiveRecord::Migration[7.2]
  def change
    create_table :release_executions do |t|
      t.references :user, foreign_key: true
      t.string  :ip_address
      t.integer :orders_deleted,    null: false, default: 0
      t.integer :order_items_deleted, null: false, default: 0
      t.integer :customers_deleted, null: false, default: 0
      t.datetime :executed_at, null: false
    end

    add_index :release_executions, :executed_at, order: { executed_at: :desc }
  end
end
