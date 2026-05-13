module Api
  module V1
    class StoreController < ApplicationController
      def show
        settings = StoreSetting.instance
        render json: {
          event_name:                settings.event_name,
          edition:                   settings.edition,
          shipping_fee_cents:        settings.shipping_fee_cents,
          free_shipping_above_cents: settings.free_shipping_above_cents,
          pickup_zipcode:            settings.pickup_zipcode,
          pickup_street:             settings.pickup_street,
          pickup_number:             settings.pickup_number,
          pickup_complement:         settings.pickup_complement,
          pickup_city:               settings.pickup_city,
          pickup_state:              settings.pickup_state,
        }
      end
    end
  end
end
