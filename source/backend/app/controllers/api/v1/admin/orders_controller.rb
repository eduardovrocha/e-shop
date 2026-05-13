module Api
  module V1
    module Admin
      class OrdersController < BaseController
        def index
          orders = Order.order(created_at: :desc)
          orders = orders.where(status: params[:status]) if params[:status].present?
          if params[:search].present?
            q = "%#{params[:search]}%"
            orders = orders.where("customer_name ILIKE ? OR customer_email ILIKE ?", q, q)
          end
          paginated = orders.page(params[:page]).per(params[:per_page] || 10)
          render json: { orders: paginated.map { |o| OrderSerializer.new(o).as_json }, meta: pagination_meta(paginated) }
        end

        def show
          order = Order.includes(:status_histories).find(params[:id])
          render json: order_detail_payload(order)
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Pedido não encontrado" }, status: :not_found
        end

        def update
          order = Order.find(params[:id])

          # Status transition via service (records history + sends email)
          if order_params[:status].present? && order_params[:status] != order.status
            result = OrderStatusService.transition(
              order,
              order_params[:status],
              admin:       current_admin&.email,
              description: order_params[:notes],
              force:       true
            )
            return render json: { error: result[:error] }, status: :unprocessable_entity unless result[:ok]
          end

          # Update non-status fields directly
          non_status = order_params.except(:status).to_h
          order.update!(non_status) if non_status.present?

          render json: order_detail_payload(order.reload)
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Pedido não encontrado" }, status: :not_found
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        def resend_email
          order = Order.find(params[:id])
          OrderStatusEmailJob.perform_later(order.id, order.status)
          render json: { ok: true, message: "Email de notificação reenviado" }
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Pedido não encontrado" }, status: :not_found
        end

        private

        def order_params
          params.require(:order).permit(
            :status, :tracking_code, :notes,
            :carrier, :shipping_service, :estimated_delivery
          )
        end

        def order_detail_payload(order)
          OrderDetailSerializer.new(order).as_json
        end

        def pagination_meta(collection)
          {
            current_page: collection.current_page,
            total_pages:  collection.total_pages,
            total_count:  collection.total_count,
            per_page:     collection.limit_value,
          }
        end
      end
    end
  end
end
