class OrderBroadcastService
  CHANNEL = 'orders:new'

  def self.call(order)
    new(order).call
  end

  def initialize(order)
    @order = order
  end

  def call
    ActionCable.server.broadcast(CHANNEL, message)
    Rails.logger.info "[ActionCable] new_order broadcast: #{@order.number || @order.id}"
  rescue => e
    Rails.logger.error "[ActionCable] OrderBroadcastService failed for order #{@order.id}: #{e.message}"
  end

  private

  def message
    {
      type:    'new_order',
      payload: {
        id:         @order.id,
        number:     @order.number,
        customer:   @order.customer_name,
        items:      items_count,
        total:      @order.total_cents / 100.0,
        status:     @order.status,
        created_at: @order.created_at.iso8601
      }
    }
  end

  def items_count
    Array(@order.items).sum { |i| (i["quantity"] || 0).to_i }
  end
end
