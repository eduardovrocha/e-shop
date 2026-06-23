module Api
  module V1
    module Admin
      class OrdersController < BaseController
        def index
          orders = Order.order(created_at: :desc)
          orders = orders.where(status: params[:status]) if params[:status].present?
          orders = orders.where(source: params[:source]) if params[:source].present?
          if params[:search].present?
            q              = "%#{params[:search]}%"
            tax_id_digits  = params[:search].to_s.gsub(/\D/, "")
            # Match exato em tax_id quando o termo tem 11 ou 14 dígitos —
            # caso contrário cai pro ILIKE em name/email. Tax_id é indexado
            # então a comparação por igualdade é barata e precisa.
            if tax_id_digits.length == 11 || tax_id_digits.length == 14
              orders = orders.where("customer_name ILIKE ? OR customer_email ILIKE ? OR tax_id = ?",
                                    q, q, tax_id_digits)
            else
              orders = orders.where("customer_name ILIKE ? OR customer_email ILIKE ?", q, q)
            end
          end
          paginated = orders.page(params[:page]).per(params[:per_page] || 10)
          render json: { orders: paginated.map { |o| OrderSerializer.new(o).as_json }, meta: pagination_meta(paginated) }
        end

        # GET /api/v1/admin/orders/lookup_by_tax_id?tax_id=...
        # Usado pelo form de pedido manual para sinalizar cliente recorrente
        # após validação client-side. Não retorna informação pessoal —
        # apenas contagem + data do primeiro pedido. O detalhe é puxado pela
        # lista normal (busca já filtra por tax_id).
        def lookup_by_tax_id
          digits = params[:tax_id].to_s.gsub(/\D/, "")
          unless digits.match?(/\A(\d{11}|\d{14})\z/) && TaxIdChecksum.valid?(digits)
            return render json: { orders_count: 0, first_order_at: nil }
          end

          rel = Order.where(tax_id: digits)
          render json: {
            orders_count:   rel.count,
            first_order_at: rel.minimum(:created_at)
          }
        end

        def show
          order = Order.includes(:status_histories).find(params[:id])
          render json: order_detail_payload(order)
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Pedido não encontrado" }, status: :not_found
        end

        # Registra uma venda fechada fora do site (pedido manual). Reusa o
        # mesmo Order/OrderItem e o mesmo fluxo de estoque/produção do site.
        def create
          result = ManualOrderService.call(manual_order_params, admin: current_admin)

          if result.ok?
            render json: order_detail_payload(result.order), status: :created
          else
            # Quando o erro vem das validações do Order (typicamente
            # CPF/CNPJ ausente ou inválido), preserva o mapa por-campo
            # para que o frontend faça binding inline. Caso contrário,
            # mantém o contrato antigo `{ error: msg }`.
            payload = { error: result.error }
            payload[:errors] = result.field_errors if result.field_errors.present?
            render json: payload, status: :unprocessable_entity
          end
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

        def manual_order_params
          params.require(:manual_order).permit(
            :external_payment_method, :paid_at, :shipping_mode,
            :shipping_fee_cents, :manual_shipping_cost_cents,
            :carrier, :shipping_service, :manual_discount_cents, :notes,
            customer:         %i[name email phone tax_id],
            shipping_address: %i[cep address city state neighborhood number complement],
            items:            %i[variant_id quantity unit_price_cents]
          ).to_h
        end

        def order_detail_payload(order)
          OrderDetailSerializer.new(order).as_json
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
