module Api
  module V1
    module Admin
      class ShippingSettingsController < BaseController
        def show
          render json: serialize(ShippingSetting.instance)
        end

        def update
          setting = ShippingSetting.instance
          if setting.update(permitted_params)
            render json: serialize(setting)
          else
            render json: { errors: setting.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def test_connection
          setting = ShippingSetting.instance

          unless setting.me_configured?
            return render json: {
              success: false,
              message: "Access token e CEP de origem são obrigatórios para testar a conexão"
            }, status: :unprocessable_entity
          end

          dims = params.permit(:weight, :height, :width, :length, :insurance_value)
                       .to_h.symbolize_keys.transform_values(&:to_f)
          result = Shipping::Providers::MelhorEnvioProvider.new(setting).test_connection(dims)
          render json: result, status: result[:success] ? :ok : :unprocessable_entity
        end

        private

        def permitted_params
          params.require(:shipping_setting).permit(
            :origin_zipcode, :sender_name, :sender_phone,
            :sender_address, :sender_number, :sender_city, :sender_state,
            :me_client_id, :me_client_secret, :me_access_token, :me_refresh_token, :me_sandbox,
            :free_shipping_enabled, :free_shipping_above_cents,
            :local_pickup_enabled, :global_extra_days, :global_extra_margin_pct
          )
        end

        def serialize(s)
          {
            origin_zipcode:           s.origin_zipcode,
            sender_name:              s.sender_name,
            sender_phone:             s.sender_phone,
            sender_address:           s.sender_address,
            sender_number:            s.sender_number,
            sender_city:              s.sender_city,
            sender_state:             s.sender_state,
            me_client_id:             s.me_client_id,
            me_client_secret_set:     s.me_client_secret.present?,
            me_access_token_set:      s.me_access_token.present?,
            me_sandbox:               s.me_sandbox,
            free_shipping_enabled:    s.free_shipping_enabled,
            free_shipping_above_cents: s.free_shipping_above_cents,
            local_pickup_enabled:     s.local_pickup_enabled,
            global_extra_days:        s.global_extra_days,
            global_extra_margin_pct:  s.global_extra_margin_pct,
            me_configured:            s.me_configured?
          }
        end
      end
    end
  end
end
