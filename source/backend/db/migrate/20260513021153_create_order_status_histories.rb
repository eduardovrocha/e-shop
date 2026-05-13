class CreateOrderStatusHistories < ActiveRecord::Migration[7.2]
  def change
    create_table :order_status_histories do |t|
      t.references :order,  null: false, foreign_key: true
      t.string     :status, null: false
      t.string     :title,  null: false
      t.text       :description
      t.jsonb      :metadata, default: {}
      t.string     :created_by

      t.timestamps
    end

    add_index :order_status_histories, :status
    add_index :order_status_histories, :created_at
  end
end
