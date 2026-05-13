class CreateCustomers < ActiveRecord::Migration[7.2]
  def change
    create_table :customers do |t|
      t.string :email,  null: false, default: ""
      t.string :name,   null: false, default: ""
      t.string :phone,  null: false, default: ""
      t.timestamps
    end

    add_index :customers, :email, unique: true
  end
end
