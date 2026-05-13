module Api
  module V1
    class StoreSettingsController < Api::V1::Admin::BaseController
      skip_before_action :authenticate_request!, only: [:show]
      skip_before_action :require_admin!,        only: [:show]

      def show
        render json: headline_json(StoreSetting.instance)
      end

      def update
        settings = StoreSetting.instance
        if settings.update(headline_params)
          render json: headline_json(settings)
        else
          render json: { errors: settings.errors }, status: :unprocessable_entity
        end
      end

      private

      def headline_json(settings)
        {
          headline_primary:     settings.headline_primary,
          headline_secondary:   settings.headline_secondary,
          headline_description: settings.headline_description,
          footer_description:   settings.footer_description,
        }
      end

      def headline_params
        params.permit(:headline_primary, :headline_secondary, :headline_description,
                      :footer_description)
      end
    end
  end
end
