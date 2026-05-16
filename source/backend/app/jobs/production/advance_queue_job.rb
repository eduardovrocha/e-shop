module Production
  # Advances the production queue of a made_to_order product: promotes as
  # many "paid" OrderItems as there are free production slots (capacity minus
  # currently in_production count). Idempotent under concurrent execution
  # thanks to a Postgres advisory transaction lock keyed by product_id.
  class AdvanceQueueJob < ApplicationJob
    queue_as :default

    def perform(product_id)
      # CRC32 always returns a 32-bit unsigned integer; we coerce explicitly
      # and pass it through sanitize_sql_array so Brakeman recognizes the
      # value as a bound parameter rather than raw interpolation.
      lock_key = Integer(Zlib.crc32("production_queue_#{product_id}"))

      ActiveRecord::Base.transaction do
        ActiveRecord::Base.connection.execute(
          ActiveRecord::Base.sanitize_sql_array([ "SELECT pg_advisory_xact_lock(?)", lock_key ])
        )

        product = Product.find_by(id: product_id)
        return unless product&.made_to_order?

        capacity = product.production_capacity.to_i
        return if capacity <= 0

        in_production_count = product.order_items
                                     .where(production_status: OrderItem.production_statuses[:in_production])
                                     .count
        slots_available = capacity - in_production_count
        return if slots_available <= 0

        next_in_queue = product.order_items
                               .where(production_status: OrderItem.production_statuses[:paid])
                               .order(:created_at)
                               .limit(slots_available)
                               .to_a

        next_in_queue.each(&:start_production!)
      end
    end
  end
end
