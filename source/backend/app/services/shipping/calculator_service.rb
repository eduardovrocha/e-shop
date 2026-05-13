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

      if setting.local_pickup_enabled
        results << pickup_option
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

      results.sort_by { |r| [ r[:price_cents], r[:delivery_days] ] }
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
