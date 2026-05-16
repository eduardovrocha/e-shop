class OrderStatusService
  NOTIFIABLE_STATUSES = %w[
    paid processing ready_to_ship producing packed shipped out_for_delivery delivered cancelled refunded
  ].freeze

  # Records the current status of a newly created order (no status change).
  def self.record(order, admin: "system", description: nil)
    new(order, order.status, admin: admin, description: description).record_only
  end

  # Transitions to a new status, records history, and enqueues notification.
  # force: true bypasses the state machine — intended for admin manual overrides only.
  def self.transition(order, new_status, admin: nil, description: nil, metadata: {}, force: false)
    new(order, new_status, admin: admin, description: description, metadata: metadata, force: force).call
  end

  def initialize(order, new_status, admin: nil, description: nil, metadata: {}, force: false)
    @order       = order
    @new_status  = new_status.to_s
    @admin       = admin
    @description = description
    @metadata    = metadata
    @force       = force
  end

  def call
    return { ok: false, error: "Status inválido" }  unless Order::STATUSES.include?(@new_status)
    return { ok: false, error: "Status inalterado" } if @order.status == @new_status

    unless @force
      allowed = Order::VALID_TRANSITIONS.fetch(@order.status, [])
      return { ok: false, error: "Transição inválida: #{@order.status} → #{@new_status}" } unless allowed.include?(@new_status)
    end

    ActiveRecord::Base.transaction do
      @order.update!(status: @new_status)
      create_history_entry
    end

    enqueue_notification
    log_transition

    { ok: true }
  rescue ActiveRecord::RecordInvalid => e
    { ok: false, error: e.message }
  end

  def record_only
    create_history_entry
    enqueue_notification
  end

  private

  def create_history_entry
    OrderStatusHistory.create!(
      order:       @order,
      status:      @new_status,
      title:       OrderStatusHistory.title_for(@new_status),
      description: @description,
      metadata:    @metadata,
      created_by:  @admin
    )
  end

  def enqueue_notification
    return unless send_status_change_email?(@order, @new_status)
    OrderStatusEmailJob.perform_later(@order.id, @new_status)
  end

  # Suppresses the generic ready_to_ship email for orders that never had
  # a production phase (i.e. orders made entirely of from_stock items).
  # Those customers already received the "paid" email; a second notification
  # seconds later would be noise.
  def send_status_change_email?(order, new_status)
    return false unless NOTIFIABLE_STATUSES.include?(new_status)

    if new_status == "ready_to_ship"
      return order.order_items.where.not(production_started_at: nil).exists?
    end

    true
  end

  def log_transition
    Rails.logger.info(
      "[OrderStatus] Order #{@order.number || @order.id} → #{@new_status}" \
      " | by=#{@admin || 'system'}"
    )
  end
end
