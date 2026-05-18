module Api
  module V1
    module Admin
      class ProductionMetricsController < BaseController
        ALLOWED_PERIODS = [ 7, 30, 90 ].freeze
        DEFAULT_PERIOD  = 30

        # GET /api/v1/admin/production/metrics
        def show
          period_days = parse_period(params[:period_days])
          product_id  = params[:product_id].presence&.to_i
          since       = period_days.days.ago

          base = OrderItem.joins(:product_variant)
          base = base.where(product_variants: { product_id: product_id }) if product_id

          # ── Queue time (paid → in_production), measured for items whose
          # production started inside the window.
          queue_scope = base.where.not(production_started_at: nil)
                            .where(production_started_at: since..)
          queue_pairs = queue_scope.pluck(:created_at, :production_started_at)
          queue_hours = queue_pairs.filter_map { |c, s| ((s - c) / 3600.0) if c && s }
          avg_queue_time_hours = average(queue_hours)

          # ── Production time (in_production → ready_to_ship)
          prod_scope = base.where.not(production_started_at: nil)
                           .where.not(production_completed_at: nil)
                           .where(production_completed_at: since..)
          prod_pairs = prod_scope.pluck(:production_started_at, :production_completed_at)
          prod_hours = prod_pairs.filter_map { |s, c| ((c - s) / 3600.0) if s && c }
          avg_production_time_hours = average(prod_hours)

          # ── Throughput: items that reached shipped/delivered in the window.
          # We use updated_at as the timestamp proxy since OrderStatusHistory
          # is order-level, not item-level. Comment-flagged because if order
          # updates churn for unrelated reasons this could over-count.
          shipped_scope = base.where(production_status: [ :shipped, :delivered ])
                              .where(updated_at: since..)
          shipped_count = shipped_scope.count
          weeks_in_period = period_days / 7.0
          throughput_per_week = (shipped_count / weeks_in_period).round(1)

          # ── Cancellation rate within the period (by item created_at).
          total_in_period    = base.where(created_at: since..).count
          canceled_in_period = base.where(production_status: :canceled, created_at: since..).count
          cancellation_rate  = total_in_period.positive? ?
                                 (canceled_in_period.to_f / total_in_period).round(3) : 0.0

          # ── Snapshot of "now" (not bounded by period).
          snapshot_base = OrderItem.joins(:product_variant)
          snapshot_base = snapshot_base.where(product_variants: { product_id: product_id }) if product_id
          in_queue_now      = snapshot_base.where(production_status: :paid).count
          in_production_now = snapshot_base.where(production_status: :in_production).count

          render json: {
            period_days:                period_days,
            product_id:                 product_id,
            avg_queue_time_hours:       avg_queue_time_hours.round(1),
            avg_production_time_hours:  avg_production_time_hours.round(1),
            throughput_per_week:        throughput_per_week,
            cancellation_rate:          cancellation_rate,
            in_queue_now:               in_queue_now,
            in_production_now:          in_production_now,
            samples: {
              queue_time:      queue_hours.size,
              production_time: prod_hours.size,
              throughput:      shipped_count,
              cancellation:    total_in_period
            }
          }
        end

        private

        def parse_period(raw)
          requested = raw.to_i
          ALLOWED_PERIODS.include?(requested) ? requested : DEFAULT_PERIOD
        end

        def average(values)
          return 0.0 if values.empty?
          values.sum / values.size
        end
      end
    end
  end
end
