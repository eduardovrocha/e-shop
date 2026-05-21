# Wipes business data the first time the store goes live ("start release"):
# clears orders, the production queue (order_items + status history), the
# customer base, webhook idempotency, the onboarding tour, and resets stock
# reservations. Auditing config (stripe_settings, stripe_mode_changes,
# users, products, categories, store_settings, shipping_*) stays intact.
#
# Hard gate: once a ReleaseExecution row exists, subsequent calls are
# rejected unless the operator sets ALLOW_RELEASE_REWIPE=yes on the server.
# The flag lives outside the database on purpose — re-running this is an
# operations decision, not an app-level toggle.
class ReleaseWipeService
  Result = Struct.new(:ok, :execution, :counts, :error, keyword_init: true) do
    def ok? = ok
  end

  # Tables deleted (in FK-safe order) plus the tables whose PK sequences
  # are reset back to 1. Listed explicitly so the contract is obvious from
  # the source — no implicit "wipe everything".
  WIPE_TARGETS = %w[
    order_status_histories
    order_items
    orders
    customer_addresses
    customers
    processed_webhook_events
    onboarding_progresses
  ].freeze

  def self.call(user:, ip_address: nil)
    new(user: user, ip_address: ip_address).call
  end

  def initialize(user:, ip_address:)
    @user       = user
    @ip_address = ip_address
  end

  def call
    if already_executed? && ENV["ALLOW_RELEASE_REWIPE"] != "yes"
      previous = ReleaseExecution.order(executed_at: :desc).first
      return Result.new(
        ok:    false,
        error: "Release wipe já executado em " \
               "#{previous.executed_at.iso8601}. Defina " \
               "ALLOW_RELEASE_REWIPE=yes no servidor para reexecutar."
      )
    end

    counts    = {}
    execution = nil

    ActiveRecord::Base.transaction do
      counts[:order_status_histories]   = OrderStatusHistory.delete_all
      counts[:order_items]              = OrderItem.delete_all
      counts[:orders]                   = Order.delete_all
      counts[:customer_addresses]       = CustomerAddress.delete_all
      counts[:customers]                = Customer.delete_all
      counts[:processed_webhook_events] = ProcessedWebhookEvent.delete_all
      counts[:onboarding_progresses]    = OnboardingProgress.delete_all
      counts[:reserved_quantity_reset]  =
        ProductVariant.where("reserved_quantity > 0").update_all(reserved_quantity: 0)

      WIPE_TARGETS.each do |table|
        ActiveRecord::Base.connection.reset_pk_sequence!(table)
      end

      execution = ReleaseExecution.create!(
        user:                @user,
        ip_address:          @ip_address,
        orders_deleted:      counts[:orders],
        order_items_deleted: counts[:order_items],
        customers_deleted:   counts[:customers],
        executed_at:         Time.current
      )
    end

    Rails.logger.warn(
      "[ReleaseWipe] executed by user_id=#{@user&.id} counts=#{counts.inspect}"
    )

    Result.new(ok: true, execution: execution, counts: counts)
  end

  private

  def already_executed?
    ReleaseExecution.exists?
  end
end
