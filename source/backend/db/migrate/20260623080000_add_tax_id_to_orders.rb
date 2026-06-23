class AddTaxIdToOrders < ActiveRecord::Migration[7.2]
  def change
    # CPF (11 dígitos) ou CNPJ (14 dígitos), sempre armazenados sem máscara.
    # NULLABLE: pedidos pré-existentes ao deploy permanecem com tax_id nil.
    # A obrigatoriedade é aplicada via validação `on: :create` no modelo, não
    # no schema, para não quebrar updates de pedidos legados.
    add_column :orders, :tax_id, :string, limit: 14
    add_column :orders, :tax_id_kind, :integer
    add_index  :orders, :tax_id
  end
end
