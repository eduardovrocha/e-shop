class CreateStripeModeChanges < ActiveRecord::Migration[7.2]
  def change
    create_table :stripe_mode_changes do |t|
      t.references :user, null: false, foreign_key: true
      t.string :previous_mode, null: false
      t.string :new_mode, null: false
      t.string :ip_address
      t.datetime :created_at, null: false
    end

    add_index :stripe_mode_changes, :created_at, order: { created_at: :desc }
  end
end
