module Api
  module V1
    module Admin
      class ReportsController < BaseController
        # GET /api/v1/admin/reports/orders(.pdf)
        # status ausente ou "all" → relatório agrupado por status.
        def orders
          status = params[:status].presence
          status = nil if status == "all"

          if status && Order::STATUSES.exclude?(status)
            return render json: { error: "Status inválido" }, status: :unprocessable_entity
          end

          scope = Order.includes(order_items: { product_variant: :product })
                       .order(created_at: :desc)
          scope = scope.where(status: status) if status

          pdf = OrdersReportPdf.new(orders: scope.to_a, status: status).render

          send_data pdf,
                    filename:    report_filename(status),
                    type:        "application/pdf",
                    disposition: "attachment"
        end

        private

        def report_filename(status)
          slug = status || "todos"
          "relatorio-pedidos-#{slug}-#{Date.current.strftime('%Y%m%d')}.pdf"
        end
      end
    end
  end
end
