class CreateStripeSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :stripe_settings do |t|
      t.string :active_mode, null: false, default: "test"
      t.text :test_publishable_key
      t.text :test_secret_key
      t.text :test_webhook_secret
      t.text :live_publishable_key
      t.text :live_secret_key
      t.text :live_webhook_secret
      t.timestamps
    end
  end
end
