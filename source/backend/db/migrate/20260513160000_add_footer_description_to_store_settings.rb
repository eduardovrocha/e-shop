class AddFooterDescriptionToStoreSettings < ActiveRecord::Migration[7.2]
  def change
    add_column :store_settings, :footer_description, :text,
               default: "Camisetas artesanais da Festa de Andrequicé — " \
                        "fé, tradição e arte do interior de Minas Gerais.",
               null: false
  end
end
