module Api
  module V1
    module Admin
      class SettingsController < BaseController
        def show
          render json: StoreSetting.instance
        end

        def stripe_info
          pk = ENV.fetch("VITE_STRIPE_PUBLISHABLE_KEY", "")
          sk = ENV.fetch("STRIPE_SECRET_KEY", "")
          mode = sk.start_with?("sk_test") ? "test" : sk.start_with?("sk_live") ? "live" : "unknown"

          render json: {
            mode:                  mode,
            publishable_key_hint:  mask_key(ENV.fetch("VITE_STRIPE_PUBLISHABLE_KEY", "")),
            secret_key_hint:       mask_key(sk),
          }
        end

        def update
          settings = StoreSetting.instance
          if settings.update(settings_params)
            render json: settings
          else
            render json: { errors: settings.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def mask_key(key)
          return "" if key.blank?
          "#{key.slice(0, 20)}••••••••#{key.last(4)}"
        end

        def settings_params
          params.require(:store_setting).permit(
            :contact_email, :whatsapp_number,
            :pickup_zipcode, :pickup_street, :pickup_number, :pickup_complement,
            :pickup_city, :pickup_state,
            :free_shipping_above_cents, :shipping_fee_cents
          )
        end
      end
    end
  end
end
