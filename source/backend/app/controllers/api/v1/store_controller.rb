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
          # Whether the "Retirada presencial" delivery option appears in the
          # storefront. Toggled via /admin/settings; the Cart card hides
          # entirely when false, and the backend rejects delivery_method=pickup.
          pickup_enabled:            settings.pickup_enabled,
          # Effective pickup availability — ANDs the store-level toggle with
          # the shipping-setting toggle so either one can disable the option.
          # Frontend uses THIS field to decide whether to enable the card,
          # not pickup_enabled alone. Both must be true for the card to be
          # selectable.
          pickup_available:          settings.pickup_enabled && ShippingSetting.instance.local_pickup_enabled
        }
      end
    end
  end
end
