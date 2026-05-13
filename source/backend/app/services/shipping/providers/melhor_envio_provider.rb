require "faraday"
require "faraday/retry"

module Shipping
  module Providers
    class MelhorEnvioProvider < BaseProvider
      USER_AGENT = "Andrequicé E-shop (#{ENV.fetch("SUPPORT_EMAIL", "suporte@andrequice.store")})"
      TIMEOUT    = 10

      def initialize(setting = nil)
        @setting = setting || ShippingSetting.instance
      end

      # Testa conectividade com a API usando payload configurável (defaults: camiseta padrão)
      def test_connection(dims = {})
        products_payload = [ {
          id:              "test-product",
          width:           (dims[:width]  || 20.0).to_f,
          height:          (dims[:height] || 4.0).to_f,
          length:          (dims[:length] || 30.0).to_f,
          weight:          (dims[:weight] || 0.3).to_f,
          quantity:        1,
          insurance_value: (dims[:insurance_value] || 89.90).to_f
        } ]

        response = connection.post("/api/v2/me/shipment/calculate") do |req|
          req.body = build_request_body("01310100", products_payload)
        end

        body = response.body
        return { success: false, message: "Resposta inesperada da API" } unless body.is_a?(Array)

        available = body.count { |s| s["error"].blank? }
        { success: true, message: "Conexão OK — #{available} #{"serviço".pluralize(available)} disponíveis" }
      rescue Faraday::TimeoutError
        { success: false, message: "Timeout: a API do Melhor Envio não respondeu a tempo" }
      rescue Faraday::ConnectionFailed => e
        { success: false, message: "Falha de conexão: #{e.message}" }
      rescue StandardError => e
        { success: false, message: "Erro inesperado: #{e.message}" }
      end

      def calculate(input)
        return [] unless @setting.me_configured?

        products_payload = build_products_payload(input[:items])
        return [] if products_payload.empty?

        response = connection.post("/api/v2/me/shipment/calculate") do |req|
          req.body = build_request_body(input[:to_zipcode], products_payload)
        end

        parse_response(response)
      rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
        Rails.logger.warn("[MelhorEnvio] Connection error: #{e.message}")
        []
      rescue StandardError => e
        Rails.logger.error("[MelhorEnvio] Unexpected error: #{e.class} — #{e.message}")
        []
      end

      private

      def connection
        @connection ||= Faraday.new(url: @setting.me_base_url) do |f|
          f.options.timeout      = TIMEOUT
          f.options.open_timeout = 5
          f.request :retry, max: 2, retry_statuses: [ 429, 503 ]
          f.request  :json
          f.response :json
          f.headers["Authorization"] = "Bearer #{@setting.me_access_token}"
          f.headers["Content-Type"]  = "application/json"
          f.headers["Accept"]        = "application/json"
          f.headers["User-Agent"]    = USER_AGENT
        end
      end

      def build_request_body(to_zipcode, products_payload)
        insurance_total = products_payload.sum { |p| p[:insurance_value].to_f }
        {
          from: { postal_code: @setting.origin_zipcode.gsub(/\D/, "") },
          to:   { postal_code: to_zipcode.gsub(/\D/, "") },
          products: products_payload,
          options: {
            insurance_value: insurance_total.round(2),
            receipt:  false,
            own_hand: false,
            collect:  false
          }
        }
      end

      def build_products_payload(items)
        items.filter_map do |item|
          product = Product.find_by(id: item[:product_id])
          next unless product&.has_dimensions?

          {
            id:              product.id.to_s,
            width:           product.width_cm,
            height:          product.height_cm,
            length:          product.length_cm,
            weight:          product.weight_kg,
            quantity:        [ item[:quantity].to_i, 1 ].max,
            insurance_value: ((product.price_cents * [ item[:quantity].to_i, 1 ].max) / 100.0).round(2)
          }
        end
      end

      def parse_response(response)
        body = response.body
        return [] unless body.is_a?(Array)

        enabled_ids  = ShippingCarrier.enabled.pluck(:me_service_id)
        global       = @setting

        body.filter_map do |svc|
          next if svc["error"].present?
          next unless enabled_ids.include?(svc["id"])

          carrier     = ShippingCarrier.find_by(me_service_id: svc["id"])
          price_cents = apply_rules(
            base_cents: (svc["price"].to_f * 100).round,
            carrier:    carrier
          )

          extra_days = (carrier&.extra_days || 0) + global.global_extra_days

          ShippingOption.new(
            provider:      "Melhor Envio",
            service_id:    svc["id"],
            carrier:       svc.dig("company", "name") || "",
            service:       svc["name"] || "",
            price_cents:   price_cents,
            delivery_days: svc["delivery_time"].to_i + extra_days,
            currency:      "BRL",
            error:         nil
          )
        end
      end

      def apply_rules(base_cents:, carrier:)
        global_margin  = @setting.global_extra_margin_pct.to_f
        carrier_margin = carrier&.extra_margin_pct.to_f || 0
        total_margin   = global_margin + carrier_margin

        with_margin = (base_cents * (1 + total_margin / 100.0)).round
        min_cents   = carrier&.min_value_cents || 0

        [ with_margin, min_cents ].max
      end
    end
  end
end
