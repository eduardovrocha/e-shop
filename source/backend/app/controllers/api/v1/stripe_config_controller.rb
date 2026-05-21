module Api
  module V1
    class StripeConfigController < ApplicationController
      # GET /api/v1/stripe/config
      # Returns the active publishable key and mode so the storefront can
      # initialize Stripe.js at runtime. Never exposes secret keys or
      # webhook secrets. publishable_key may be blank if the admin hasn't
      # configured the active mode yet — the frontend must surface that.
      def show
        setting = StripeSetting.current
        render json: {
          publishable_key: setting.publishable_key.to_s,
          mode:            setting.active_mode
        }
      end
    end
  end
end
