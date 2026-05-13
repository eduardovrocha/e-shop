class CreateCustomerAddresses < ActiveRecord::Migration[7.2]
  def change
    create_table :customer_addresses do |t|
      t.references :customer, null: false, foreign_key: true
      t.string  :zipcode,      null: false, default: ""
      t.string  :street,       null: false, default: ""
      t.string  :number,       null: false, default: ""
      t.string  :complement,   null: false, default: ""
      t.string  :neighborhood, null: false, default: ""
      t.string  :city,         null: false, default: ""
      t.string  :state,        null: false, default: ""
      t.string  :country,      null: false, default: "BR"
      t.boolean :is_default,   null: false, default: false
      t.timestamps
    end

    add_index :customer_addresses, [:customer_id, :is_default]
  end
end
