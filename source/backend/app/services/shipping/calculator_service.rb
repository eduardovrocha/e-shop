module Shipping
  class CalculatorService
    def initialize(providers: nil)
      @providers = providers || default_providers
    end

    # @param to_zipcode [String]
    # @param items [Array<{product_id: Integer, quantity: Integer}>]
    # @return [Array<Hash>]
    def calculate(to_zipcode:, items:)
      setting = ShippingSetting.instance
      results = []

      # Inject the pickup option whenever ShippingSetting.local_pickup_enabled
      # is on. When the Cart-level master switch (StoreSetting.pickup_enabled)
      # is off, we still surface the option but flag it as disabled so the
      # storefront can render it as visibly-unavailable rather than hide it
      # outright — matches the same UX as the "Retirada presencial" card.
      if setting.local_pickup_enabled
        store_allows_pickup = StoreSetting.instance.pickup_enabled
        results << pickup_option.merge(disabled: !store_allows_pickup)
      end

      if setting.free_shipping_enabled
        order_total = items.sum do |item|
          product = Product.find_by(id: item[:product_id])
          (product&.price_cents || 0) * [ item[:quantity].to_i, 1 ].max
        end

        if order_total >= setting.free_shipping_above_cents
          results << free_shipping_option
        end
      end

      input = { to_zipcode:, items: }
      @providers.each do |provider|
        options = provider.calculate(input)
        results.concat(options.map(&:to_h))
      end

      # Normalize the disabled flag so the frontend doesn't have to check
      # for undefined. The pickup row may carry disabled: true; everything
      # else is always selectable.
      results = results.map { |r| { disabled: false }.merge(r) }

      # Sort selectable rows first, then by price + speed within each bucket
      # so disabled entries land at the bottom of the list.
      results.sort_by { |r| [ r[:disabled] ? 1 : 0, r[:price_cents], r[:delivery_days] ] }
    end

    private

    def default_providers
      setting = ShippingSetting.instance
      return [] unless setting.me_configured?
      [ Providers::MelhorEnvioProvider.new(setting) ]
    end

    def pickup_option
      {
        provider:      "Loja",
        service_id:    -1,
        carrier:       "Retirada",
        service:       "Retirada na Loja",
        price_cents:   0,
        delivery_days: 0,
        currency:      "BRL",
        error:         nil
      }
    end

    def free_shipping_option
      {
        provider:      "Loja",
        service_id:    0,
        carrier:       "Frete Grátis",
        service:       "Frete Grátis",
        price_cents:   0,
        delivery_days: ShippingSetting.instance.global_extra_days,
        currency:      "BRL",
        error:         nil
      }
    end
  end
end
