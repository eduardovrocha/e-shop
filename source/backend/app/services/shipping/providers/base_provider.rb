module Shipping
  module Providers
    class BaseProvider
      ShippingOption = Struct.new(
        :provider,
        :service_id,
        :carrier,
        :service,
        :price_cents,
        :delivery_days,
        :currency,
        :error,
        keyword_init: true
      )

      # @param input [Hash] :to_zipcode, :items [{product_id:, quantity:}]
      # @return [Array<ShippingOption>]
      def calculate(input)
        raise NotImplementedError, "#{self.class}#calculate must be implemented"
      end
    end
  end
end
