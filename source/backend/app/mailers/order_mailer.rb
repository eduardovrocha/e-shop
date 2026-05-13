class OrderMailer < ApplicationMailer
  SUBJECTS = {
    "paid"             => "✅ Pagamento confirmado",
    "processing"       => "📦 Pedido em processamento",
    "producing"        => "🎨 Pedido em produção",
    "packed"           => "📫 Pedido embalado",
    "shipped"          => "🚚 Pedido enviado",
    "out_for_delivery" => "🏠 Saiu para entrega",
    "delivered"        => "🎉 Pedido entregue",
    "cancelled"        => "❌ Pedido cancelado",
    "refunded"         => "💰 Reembolso processado",
  }.freeze

  def status_update(order, status)
    @order        = order
    @status       = status
    @store_name   = StoreSetting.instance.event_name.presence || "Andrequicé"
    @public_url   = order.public_tracking_url
    @history      = order.status_histories.order(:created_at)
    @subject_base = SUBJECTS.fetch(status, "Atualização do pedido")

    mail(
      to:      order.customer_email,
      from:    "#{@store_name} <#{ENV.fetch('SUPPORT_EMAIL', 'suporte@andrequice.store')}>",
      subject: "#{@subject_base} — #{order.number}"
    )
  end
end
