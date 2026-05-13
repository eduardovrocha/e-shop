class DisputeNotificationJob < ApplicationJob
  queue_as :critical

  discard_on ActiveJob::DeserializationError

  def perform(order_id:, dispute_id:)
    order = Order.find_by(id: order_id)
    unless order
      Rails.logger.error "[DisputeNotificationJob] Pedido #{order_id} não encontrado"
      return
    end

    Rails.logger.error(
      "[DISPUTA] AÇÃO NECESSÁRIA — " \
      "pedido=#{order.number || order.id} " \
      "dispute_id=#{dispute_id} " \
      "total=#{order.total_cents} " \
      "cliente=#{order.customer_email}"
    )

    # TODO: substituir por notificação real quando AdminMailer for criado:
    # AdminMailer.dispute_created(order, dispute_id).deliver_now
    # Ou notificação Slack via HTTP:
    # SlackNotifier.alert("#ops", "Disputa aberta: pedido #{order.number} — #{dispute_id}")
  rescue => e
    Rails.logger.error "[DisputeNotificationJob] Falha order=#{order_id} dispute=#{dispute_id}: #{e.message}"
    raise
  end
end
