module Api
  module V1
    module Admin
      class SettingsController < BaseController
        def show
          render json: StoreSetting.instance
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
