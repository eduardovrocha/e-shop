class OrderStatusEmailJob < ApplicationJob
  queue_as :default
  discard_on ActiveJob::DeserializationError

  def perform(order_id, status)
    order = Order.find_by(id: order_id)
    return unless order

    OrderMailer.status_update(order, status).deliver_now
  rescue => e
    Rails.logger.error "[OrderStatusEmailJob] Failed order=#{order_id} status=#{status}: #{e.message}"
    raise
  end
end
