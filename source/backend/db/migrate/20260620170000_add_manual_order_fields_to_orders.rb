class AddManualOrderFieldsToOrders < ActiveRecord::Migration[7.2]
  def change
    # Origem do pedido. Pedidos existentes e do site = web (0); pedido
    # registrado no admin = manual (1).
    add_column :orders, :source, :integer, default: 0, null: false
    add_index  :orders, :source

    # Forma de pagamento externa — preenchida apenas para pedidos manuais
    # (o pagamento já ocorreu fora do Stripe). nil para pedidos do site.
    add_column :orders, :external_payment_method, :integer

    # Momento em que o pagamento foi confirmado. Para pedidos manuais o
    # admin informa (default: agora). nil em pedidos legados do site.
    add_column :orders, :paid_at, :datetime

    # Desconto aplicado ao total pelo admin no pedido manual (em centavos).
    add_column :orders, :manual_discount_cents, :integer, default: 0, null: false

    # Modo de envio: melhor_envio (0) | manual (1) | retirada (2).
    add_column :orders, :shipping_mode, :integer, default: 0, null: false

    # Frete digitado à mão quando shipping_mode == manual (centavos).
    add_column :orders, :manual_shipping_cost_cents, :integer

    # Admin (User) que registrou o pedido manual.
    add_reference :orders, :created_by_admin, foreign_key: { to_table: :users }, null: true

    # Pedidos manuais não têm Stripe PaymentIntent — stripe_intent_id passa a
    # aceitar nil. A unicidade continua válida (o índice único do Postgres
    # permite múltiplos NULLs).
    change_column_null :orders, :stripe_intent_id, true

    add_check_constraint :orders,
      "manual_discount_cents >= 0",
      name: "chk_orders_manual_discount_cents_non_negative"
  end
end
