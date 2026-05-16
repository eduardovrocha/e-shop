class AddFulfillmentFieldsToProductsAndCreateOrderItems < ActiveRecord::Migration[7.2]
  ORDER_STATUS_TO_PRODUCTION = {
    "pending"          => 0,
    "failed"           => 0,
    "paid"             => 1,
    "processing"       => 2,
    "producing"        => 2,
    "packed"           => 3,
    "shipped"          => 4,
    "out_for_delivery" => 4,
    "delivered"        => 5,
    "cancelled"        => 6,
    "refunded"         => 6,
    "disputed"         => 6
  }.freeze

  def up
    # ── Products: fulfillment fields ─────────────────────────────────────────
    add_column :products, :fulfillment_mode,               :integer, default: 0, null: false
    add_column :products, :production_lead_time_days,      :integer
    add_column :products, :production_capacity,            :integer
    add_column :products, :cancellation_refund_percentage, :integer

    add_index :products, :fulfillment_mode

    # ── New table: order_items ───────────────────────────────────────────────
    # Source of truth for per-item production tracking. Existing orders carry
    # their items in the `orders.items` JSONB; we backfill one row per JSON
    # entry below so the new table is consistent with historical data.
    create_table :order_items do |t|
      t.references :order,           null: false, foreign_key: true
      t.references :product_variant, null: true,  foreign_key: true
      t.references :product,         null: true,  foreign_key: true

      t.string  :name
      t.string  :size
      t.integer :quantity,         null: false, default: 1
      t.integer :unit_price_cents, null: false, default: 0
      t.integer :subtotal_cents,   null: false, default: 0

      t.integer  :production_status,        null: false, default: 0
      t.datetime :production_started_at
      t.datetime :production_completed_at
      t.date     :promised_completion_date

      t.timestamps
    end

    add_index :order_items, :production_status
    add_index :order_items, [ :product_id, :production_status ]

    backfill_order_items!
  end

  def down
    drop_table :order_items
    remove_index :products, :fulfillment_mode
    remove_column :products, :fulfillment_mode
    remove_column :products, :production_lead_time_days
    remove_column :products, :production_capacity
    remove_column :products, :cancellation_refund_percentage
  end

  private

  # Reads each existing order's items JSONB and emits one order_items row per
  # entry. production_status is derived from the parent order's status using
  # ORDER_STATUS_TO_PRODUCTION. Uses insert_all in batches to avoid loading
  # the world or triggering callbacks on a yet-empty model.
  def backfill_order_items!
    variant_to_product = {}
    rows = []
    batch_size = 500
    now = Time.current

    say_with_time "Backfilling order_items from orders.items JSONB" do
      Order.find_each(batch_size: batch_size) do |order|
        production_status = ORDER_STATUS_TO_PRODUCTION.fetch(order.status, 0)
        items             = order.items.is_a?(Array) ? order.items : []

        items.each do |raw|
          item       = raw.is_a?(Hash) ? raw : {}
          raw_variant_id = item["variant_id"] || item[:variant_id]
          raw_variant_id = raw_variant_id.to_i if raw_variant_id
          # Resolve product_id and validate variant still exists. If the variant
          # was deleted between order creation and now, we leave both FKs null
          # rather than emit a row that violates the FK constraint.
          product_id =
            if raw_variant_id && raw_variant_id > 0
              variant_to_product[raw_variant_id] ||=
                ProductVariant.where(id: raw_variant_id).pick(:product_id)
            end
          variant_id = product_id ? raw_variant_id : nil

          qty        = (item["quantity"] || item[:quantity] || 1).to_i
          qty        = 1 if qty < 1
          unit_price = (item["unit_price_cents"] || item[:unit_price_cents] || 0).to_i
          subtotal   = (item["subtotal_cents"]   || item[:subtotal_cents]   || (unit_price * qty)).to_i

          rows << {
            order_id:           order.id,
            product_variant_id: variant_id,
            product_id:         product_id,
            name:               item["name"] || item[:name],
            size:               item["size"] || item[:size],
            quantity:           qty,
            unit_price_cents:   unit_price,
            subtotal_cents:     subtotal,
            production_status:  production_status,
            created_at:         order.created_at || now,
            updated_at:         now
          }
        end

        if rows.size >= batch_size
          OrderItem.insert_all(rows)
          rows.clear
        end
      end

      OrderItem.insert_all(rows) if rows.any?
    end
  end
end
