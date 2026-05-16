module Api
  module V1
    module Admin
      class OrderItemsController < BaseController
        # GET /api/v1/admin/order_items
        # Filters: production_status, order_status, fulfillment_mode,
        #          had_production, product_id, q, sort
        def index
          scope = OrderItem.includes(order: :status_histories,
                                     product_variant: :product)

          scope = apply_production_status_filter(scope)
          scope = apply_order_status_filter(scope)
          scope = apply_fulfillment_mode_filter(scope)
          scope = apply_had_production_filter(scope)
          scope = apply_product_filter(scope)
          scope = apply_search(scope)
          scope = apply_sort(scope)

          paginated = scope.page(params[:page]).per(params[:per_page] || 50)

          render json: {
            order_items: paginated.map { |i| serialize(i) },
            meta:        pagination_meta(paginated)
          }
        end

        # PATCH /api/v1/admin/order_items/:id/start_production
        # Admin override: forces paid → in_production even if capacity is full.
        def start_production
          item = OrderItem.find(params[:id])
          unless item.paid?
            return render json: { error: "invalid_state", current: item.production_status },
                          status: :unprocessable_entity
          end

          item.start_production!
          render json: serialize(item.reload)
        rescue ActiveRecord::RecordNotFound
          render json: { error: "not_found" }, status: :not_found
        rescue OrderItem::InvalidProductionTransition => e
          render json: { error: "invalid_transition", message: e.message }, status: :unprocessable_entity
        end

        # PATCH /api/v1/admin/order_items/:id/complete_production
        def complete_production
          item = OrderItem.find(params[:id])
          unless item.in_production?
            return render json: { error: "invalid_state", current: item.production_status },
                          status: :unprocessable_entity
          end

          item.complete_production!
          render json: serialize(item.reload)
        rescue ActiveRecord::RecordNotFound
          render json: { error: "not_found" }, status: :not_found
        rescue OrderItem::InvalidProductionTransition => e
          render json: { error: "invalid_transition", message: e.message }, status: :unprocessable_entity
        end

        # PATCH /api/v1/admin/order_items/:id/cancel
        def cancel
          item = OrderItem.find(params[:id])
          result = ItemCancellationService.new(
            order_item: item,
            reason:     params[:reason],
            actor:      current_admin,
            actor_type: :admin
          ).call
          render json: result.payload, status: result.status
        rescue ActiveRecord::RecordNotFound
          render json: { error: "not_found" }, status: :not_found
        end

        private

        def apply_production_status_filter(scope)
          return scope if params[:production_status].blank?
          values = Array(params[:production_status]).flat_map { |v| v.to_s.split(",") }
          scope.where(production_status: values)
        end

        def apply_order_status_filter(scope)
          return scope if params[:order_status].blank?
          values = Array(params[:order_status]).flat_map { |v| v.to_s.split(",") }
          scope.joins(:order).where(orders: { status: values })
        end

        def apply_fulfillment_mode_filter(scope)
          return scope if params[:fulfillment_mode].blank?
          scope.joins(product_variant: :product).where(
            products: { fulfillment_mode: Product.fulfillment_modes[params[:fulfillment_mode]] }
          )
        end

        def apply_had_production_filter(scope)
          return scope unless params[:had_production].to_s == "true"
          scope.where.not(production_started_at: nil)
        end

        def apply_product_filter(scope)
          return scope if params[:product_id].blank?
          scope.where(product_id: params[:product_id])
        end

        def apply_search(scope)
          return scope if params[:q].blank?
          q = "%#{params[:q]}%"
          scope.joins(:order).where(
            "orders.number ILIKE :q OR orders.customer_name ILIKE :q OR orders.customer_email ILIKE :q",
            q: q
          )
        end

        def apply_sort(scope)
          case params[:sort]
          when "created_at_asc"             then scope.order(:created_at)
          when "created_at_desc"            then scope.order(created_at: :desc)
          when "production_started_at_asc"  then scope.order(:production_started_at)
          when "production_completed_at_desc" then scope.order(production_completed_at: :desc)
          else scope.order(:created_at)
          end
        end

        def serialize(item)
          product = item.product_variant&.product
          order   = item.order
          {
            id:                       item.id,
            order_id:                 order.id,
            order_number:             order.number,
            order_status:             order.status,
            customer_name:            order.customer_name,
            customer_email:           order.customer_email,
            product_id:               product&.id,
            product_name:             product&.name || item.name,
            product_variant_id:       item.product_variant_id,
            size:                     item.size,
            color:                    item.product_variant&.color,
            fulfillment_mode:         product&.fulfillment_mode,
            production_capacity:      product&.production_capacity,
            production_lead_time_days: product&.production_lead_time_days,
            cancellation_refund_percentage: product&.cancellation_refund_percentage,
            quantity:                 item.quantity,
            unit_price_cents:         item.unit_price_cents,
            subtotal_cents:           item.subtotal_cents,
            production_status:        item.production_status,
            promised_completion_date: item.promised_completion_date,
            production_started_at:    item.production_started_at,
            production_completed_at:  item.production_completed_at,
            created_at:               item.created_at
          }
        end

        def pagination_meta(collection)
          {
            current_page: collection.current_page,
            total_pages:  collection.total_pages,
            total_count:  collection.total_count,
            per_page:     collection.limit_value
          }
        end
      end
    end
  end
end
