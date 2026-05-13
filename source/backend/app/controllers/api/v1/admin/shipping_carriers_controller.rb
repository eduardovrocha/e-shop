module Api
  module V1
    module Admin
      class ShippingCarriersController < BaseController
        def index
          carriers = ShippingCarrier.order(:company, :name)
          render json: carriers.map { |c| serialize(c) }
        end

        def update
          carrier = ShippingCarrier.find(params[:id])
          if carrier.update(permitted_params)
            render json: serialize(carrier)
          else
            render json: { errors: carrier.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Transportadora não encontrada" }, status: :not_found
        end

        private

        def permitted_params
          params.require(:shipping_carrier).permit(
            :enabled, :extra_days, :extra_margin_pct,
            :min_value_cents, :max_value_cents, :free_above_cents
          )
        end

        def serialize(c)
          {
            id:              c.id,
            me_service_id:   c.me_service_id,
            name:            c.name,
            company:         c.company,
            display_name:    c.display_name,
            enabled:         c.enabled,
            extra_days:      c.extra_days,
            extra_margin_pct: c.extra_margin_pct,
            min_value_cents: c.min_value_cents,
            max_value_cents: c.max_value_cents,
            free_above_cents: c.free_above_cents
          }
        end
      end
    end
  end
end
