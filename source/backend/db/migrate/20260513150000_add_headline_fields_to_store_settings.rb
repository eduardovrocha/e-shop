class AddHeadlineFieldsToStoreSettings < ActiveRecord::Migration[7.2]
  def change
    add_column :store_settings, :headline_primary,
               :string,
               default: "Nossa história,",
               null: false

    add_column :store_settings, :headline_secondary,
               :string,
               default: "nossa devoção.",
               null: false

    add_column :store_settings, :headline_description,
               :text,
               default: "Camisetas artesanais da Festa de Andrequicé. Arte, fé e tradição em cada peça.",
               null: false
  end
end
