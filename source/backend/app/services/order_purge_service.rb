# Completely remove one or more orders from the database, restoring the
# side effects that were applied when the order was created (most notably
# stock deductions). Designed for cleanup of accidental writes — e.g. a
# leaky Stripe webhook delivering test events to production.
#
# By default runs in DRY mode and prints a report without touching the DB.
# Pass dry_run: false to commit the changes. The entire purge runs inside
# a single transaction — a failure on any order rolls everything back so
# you never end up with a half-cleaned state.
#
# Cascading deletes (already declared as `dependent: :destroy` on the Order
# model) take care of order_items, status_histories, and coupon_usage.
#
# Usage:
#   OrderPurgeService.run(identifiers: ["AND-000011", "AND-000010"])
#   OrderPurgeService.run(identifiers: [42, 43], dry_run: false)
#
# Stripe is NOT touched. For test-mode leaks the charges are fake; for
# real leaks, refunds should be issued separately via the Stripe dashboard
# or a dedicated refund helper. This script only reconciles your DB.
class OrderPurgeService
  Result = Struct.new(:found, :missing, :restored_stock, :destroyed_count, :dry_run, keyword_init: true)

  class << self
    def run(identifiers:, dry_run: true, io: $stdout)
      identifiers = Array(identifiers).map(&:to_s).map(&:strip).reject(&:empty?).uniq
      raise ArgumentError, "Provide at least one order identifier" if identifiers.empty?

      orders = lookup(identifiers).includes(:order_items, :status_histories, :coupon_usage)
      found_keys = (orders.map(&:number) + orders.map { |o| o.id.to_s }).uniq
      missing    = identifiers - found_keys

      print_header(io, dry_run: dry_run, identifiers: identifiers, missing: missing)

      result = Result.new(
        found:          orders.size,
        missing:        missing,
        restored_stock: Hash.new(0),
        destroyed_count: 0,
        dry_run:        dry_run,
      )

      # Wrap in a transaction so a partial failure rolls back. In dry-run
      # we still open it (and then raise to roll back) so subtle side
      # effects from increment_counter etc. don't leak.
      ActiveRecord::Base.transaction do
        orders.each do |o|
          process(o, io: io, result: result, dry_run: dry_run)
        end
        raise ActiveRecord::Rollback if dry_run
      end

      print_footer(io, result: result)
      result
    end

    private

    # Accepts either Order#number (canonical, like "AND-000011") or
    # Order#id (numeric). Picks the matching column to avoid surprising
    # casts and silently returning the wrong row.
    def lookup(identifiers)
      numeric_ids = identifiers.select { |k| k.match?(/\A\d+\z/) }.map(&:to_i)
      numbers     = identifiers - numeric_ids.map(&:to_s)

      Order.where(id: numeric_ids).or(Order.where(number: numbers))
    end

    def process(order, io:, result:, dry_run:)
      io.puts "── Order ##{order.id} · #{order.number} · #{order.customer_email}"
      io.puts "   Created: #{order.created_at}  Status: #{order.status}  Total: #{format_money(order.total_cents)}"
      io.puts "   Items:   #{order.order_items.size}"
      io.puts "   Stripe:  #{order.stripe_intent_id || '—'}"

      order.order_items.each do |item|
        variant = item.product_variant
        product = variant&.product

        # Only from_stock items had their physical stock decremented at
        # payment time. Made-to-order items don't touch stock_quantity.
        # Canceled items already had their stock restored by item
        # cancellation; restoring again would double-credit.
        if variant && product&.from_stock? && !item.canceled?
          restore_qty = item.quantity
          io.puts "   +  Restore #{restore_qty} unit(s) → variant ##{variant.id} (#{variant.sku})"
          unless dry_run
            variant.increment!(:stock_quantity, restore_qty)
          end
          result.restored_stock[variant.id] += restore_qty
        else
          io.puts "   ·  Skip stock restore for item ##{item.id} (variant=#{variant&.id || 'nil'}, mode=#{product&.fulfillment_mode || 'unknown'}, status=#{item.production_status})"
        end
      end

      # Cascading: order.destroy removes status_histories, order_items,
      # coupon_usage automatically via dependent: :destroy.
      io.puts "   ✕  Destroy order (cascades to #{order.order_items.size} items + #{order.status_histories.size} histories + #{order.coupon_usage ? 1 : 0} coupon_usage)"
      unless dry_run
        order.destroy!
      end

      result.destroyed_count += 1
      io.puts ""
    end

    def print_header(io, dry_run:, identifiers:, missing:)
      io.puts "=" * 72
      io.puts "  Order Purge — #{dry_run ? 'DRY RUN (no DB changes)' : 'COMMITTING'}"
      io.puts "  Env:     #{Rails.env}  ·  DB: #{ActiveRecord::Base.connection_db_config.database}"
      io.puts "  Targets: #{identifiers.join(', ')}"
      io.puts "  Missing: #{missing.empty? ? '—' : missing.join(', ')}"
      io.puts "=" * 72
      io.puts ""
    end

    def print_footer(io, result:)
      io.puts "─" * 72
      io.puts "  #{result.dry_run ? 'WOULD PURGE' : 'PURGED'}: #{result.destroyed_count} order(s)"
      if result.restored_stock.any?
        io.puts "  Stock #{result.dry_run ? 'would be restored' : 'restored'} across #{result.restored_stock.size} variant(s):"
        result.restored_stock.each do |vid, qty|
          io.puts "    variant ##{vid}: +#{qty}"
        end
      end
      io.puts "  Missing identifiers: #{result.missing.empty? ? '—' : result.missing.join(', ')}"
      io.puts "=" * 72
      if result.dry_run
        io.puts ""
        io.puts "  This was a DRY RUN — nothing was changed."
        io.puts "  Re-run with CONFIRM=yes to commit, or pass dry_run: false from code."
      end
    end

    def format_money(cents)
      return "R$ 0,00" if cents.nil?
      "R$ #{format('%.2f', cents / 100.0).tr('.', ',')}"
    end
  end
end
