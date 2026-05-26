class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :product_variant, optional: true
  belongs_to :product,         optional: true

  # Enum integer kept from Phase 1 — values are stable; do NOT renumber.
  enum production_status: {
    pending:        0,
    paid:           1,
    in_production:  2,
    ready_to_ship:  3,
    shipped:        4,
    delivered:      5,
    canceled:       6
  }

  # Manual state machine in the project's house style (mirrors Order's
  # VALID_TRANSITIONS pattern). Each event method validates the source state,
  # updates timestamps inside a transaction, and fires the side effects
  # (enqueue queue advance, refresh order aggregate).
  VALID_PRODUCTION_TRANSITIONS = {
    "pending"       => %w[paid],
    "paid"          => %w[in_production ready_to_ship canceled],
    "in_production" => %w[ready_to_ship canceled],
    "ready_to_ship" => %w[shipped],
    "shipped"       => %w[delivered],
    "delivered"     => %w[],
    "canceled"      => %w[]
  }.freeze

  class InvalidProductionTransition < StandardError; end

  scope :active_for_production, -> { where.not(production_status: :canceled) }

  # ── Profitability ────────────────────────────────────────────────────────
  # unit_cost_cents is snapshotted at purchase time (in
  # payments_controller#create_order_items_for!) so that subsequent admin
  # edits to the product cost don't rewrite history. nil here means cost
  # was never captured (legacy data or admin hadn't set it) — callers
  # must branch on that to avoid pretending profit = revenue.

  def cost_subtotal_cents
    return nil if unit_cost_cents.nil?
    unit_cost_cents * quantity
  end

  # Gross profit for this line: revenue (subtotal) minus production cost.
  # Returns nil when cost is unknown — UI shows "—" rather than treating
  # missing data as 100% profit. Doesn't account for shipping, coupons or
  # Stripe fees; that's by design (Fase 1 scope).
  def gross_profit_cents
    return nil if cost_subtotal_cents.nil?
    subtotal_cents - cost_subtotal_cents
  end

  # Margin as a percentage of revenue (0-100). nil when cost missing or
  # subtotal is zero (free items shouldn't compute margin).
  def margin_percentage
    return nil if gross_profit_cents.nil? || subtotal_cents.to_i.zero?
    (gross_profit_cents.to_f / subtotal_cents * 100).round(2)
  end

  # Human-readable descriptor for emails and templates.
  # Returns "Tamanho M · Unissex · Normal" — full disclosure, including
  # default values, so the admin sees exactly what was sold and the
  # customer's receipt is unambiguous. Pieces are dropped only when the
  # underlying data is genuinely missing (no size, or no linked variant).
  def variant_descriptors
    parts = []
    parts << "Tamanho #{size}" if size.present?
    if product_variant&.gender.present?
      parts << product_variant.gender.capitalize
    end
    if product_variant&.cut.present?
      parts << product_variant.cut.capitalize
    end
    parts.join(" · ")
  end

  # Same as variant_descriptors, but prefixed with " — " so callers can
  # interpolate without conditionals: "#{product.name}#{item.descriptor_suffix}".
  def descriptor_suffix
    desc = variant_descriptors
    desc.present? ? " — #{desc}" : ""
  end

  def from_stock?
    product_variant&.product&.from_stock?
  end

  def made_to_order?
    product_variant&.product&.made_to_order?
  end

  # ── Events ───────────────────────────────────────────────────────────────
  # Public bang-methods. Each one:
  #   1. validates the transition
  #   2. updates the production_status column + relevant timestamp
  #   3. fires side effects AFTER commit (queue advance, aggregate refresh)

  def mark_paid!
    transition_to!("paid") do
      after_mark_paid
    end
  end

  def start_production!
    transition_to!("in_production") do
      update_columns(production_started_at: Time.current, updated_at: Time.current)
      refresh_order_aggregate
      ProductionMailer.item_entered_production(id).deliver_later if made_to_order?
    end
  end

  def complete_production!
    transition_to!("ready_to_ship") do
      update_columns(production_completed_at: Time.current, updated_at: Time.current)
      enqueue_advance_queue if made_to_order?
      refresh_order_aggregate
      # Only items that actually went through production fire this email
      # (from_stock items skip :in_production via skip_to_ready_to_ship!
      # and don't have production_started_at set, so they never reach here).
      ProductionMailer.item_ready(id).deliver_later if production_started_at.present?
    end
  end

  # Shortcut used when an item never enters production (from_stock items
  # jump straight to ready_to_ship after being paid).
  def skip_to_ready_to_ship!
    transition_to!("ready_to_ship") do
      refresh_order_aggregate
    end
  end

  def mark_shipped!
    transition_to!("shipped") do
      refresh_order_aggregate
    end
  end

  def mark_delivered!
    transition_to!("delivered") do
      refresh_order_aggregate
    end
  end

  def cancel!
    # Capture the prior state so we can release a production slot when an
    # in-production made_to_order item is canceled.
    was_in_production = in_production?
    transition_to!("canceled") do
      enqueue_advance_queue if was_in_production && made_to_order?
      refresh_order_aggregate
    end
  end

  # Permissions — used by Order#refresh_aggregate_status! before re-firing
  # transitions in case the state machine forbids the target. Mirrors the
  # `can_mark_*` helpers a real DSL would generate.
  def can_mark_paid?
    VALID_PRODUCTION_TRANSITIONS.fetch(production_status, []).include?("paid")
  end

  private

  def transition_to!(target)
    unless VALID_PRODUCTION_TRANSITIONS.fetch(production_status, []).include?(target)
      raise InvalidProductionTransition,
            "OrderItem ##{id}: cannot transition #{production_status} → #{target}"
    end

    ActiveRecord::Base.transaction do
      update!(production_status: target)
      yield if block_given?
    end
  end

  # Routes the after-paid behavior: from_stock items skip straight to
  # ready_to_ship (no production needed); made_to_order items kick the queue
  # advance job which will promote them to :in_production if a slot is free.
  def after_mark_paid
    if from_stock?
      skip_to_ready_to_ship!
    elsif made_to_order? && product_variant&.product_id
      enqueue_advance_queue
      refresh_order_aggregate
    else
      refresh_order_aggregate
    end
  end

  def enqueue_advance_queue
    return unless product_variant&.product_id
    Production::AdvanceQueueJob.perform_later(product_variant.product_id)
  end

  def refresh_order_aggregate
    order.reload.refresh_aggregate_status!
  end
end
