module Api
  module V1
    module Admin
      class DashboardController < BaseController
        # All statuses that represent a successful payment (regardless of fulfillment stage)
        PAID_STATUSES = %w[paid processing producing packed shipped out_for_delivery delivered].freeze

        def stats
          paid_orders = Order.where(status: PAID_STATUSES)

          render json: {
            revenue_cents:           paid_orders.sum(:total_cents),
            paid_orders_count:       paid_orders.count,
            pending_orders_count:    Order.pending.count,
            average_ticket_cents:    paid_orders.average(:total_cents).to_i,
            weekly_sales:            weekly_sales_data,
            top_products:            top_products_data,
            low_stock_count:         ProductVariant.low_stock.count,
            awaiting_shipment_count: Order.where(status: %w[paid processing producing packed]).count,
            recent_orders:           recent_orders_data,
          }
        end

        private

        def recent_orders_data
          Order.order(created_at: :desc).limit(5).map do |o|
            {
              id:            o.id,
              number:        o.number,
              customer_name: o.customer_name,
              status:        o.status,
              total_cents:   o.total_cents,
              created_at:    o.created_at,
            }
          end
        end

        def weekly_sales_data
          start_date = 6.days.ago.beginning_of_day

          rows = Order.where(status: PAID_STATUSES)
                      .where("created_at >= ?", start_date)
                      .group("DATE(created_at)")
                      .sum(:total_cents)

          day_labels = %w[Dom Seg Ter Qua Qui Sex Sáb]
          (0..6).map do |offset|
            date = start_date.to_date + offset
            {
              day:    day_labels[date.wday],
              vendas: (rows[date] || 0) / 100.0,
            }
          end
        end

        def top_products_data
          result = ActiveRecord::Base.connection.execute(<<~SQL)
            SELECT
              item->>'name' AS name,
              item->>'size' AS size,
              SUM((item->>'quantity')::int) AS qty
            FROM orders,
              jsonb_array_elements(items) AS item
            WHERE status NOT IN ('pending', 'failed', 'cancelled', 'refunded')
              AND jsonb_array_length(items) > 0
            GROUP BY item->>'name', item->>'size'
            ORDER BY qty DESC
            LIMIT 5
          SQL

          result.map { |row| { name: row["name"], size: row["size"] || "-", qty: row["qty"].to_i } }
        end
      end
    end
  end
end
