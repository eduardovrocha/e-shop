module Api
  module V1
    class ShippingController < ApplicationController
      before_action :validate_params!

      def calculate
        service = Shipping::CalculatorService.new
        options = service.calculate(
          to_zipcode: params[:zipcode].to_s.gsub(/\D/, ""),
          items:      items_param
        )
        render json: options
      rescue StandardError => e
        Rails.logger.error("[Shipping] calculate error: #{e.class} — #{e.message}")
        render json: { error: "Erro ao calcular frete. Tente novamente." }, status: :service_unavailable
      end

      private

      def validate_params!
        zipcode = params[:zipcode].to_s.gsub(/\D/, "")
        unless zipcode.length == 8
          return render json: { error: "CEP inválido" }, status: :unprocessable_entity
        end

        unless items_param.is_a?(Array) && items_param.any?
          return render json: { error: "Informe ao menos um item" }, status: :unprocessable_entity
        end

        nil
      end

      def items_param
        @items_param ||= Array(params[:items]).filter_map do |item|
          product_id = item[:productId]&.to_i || item[:product_id]&.to_i
          quantity   = item[:quantity]&.to_i || 1
          next if product_id.nil? || product_id <= 0
          { product_id:, quantity: [ quantity, 1 ].max }
        end
      end
    end
  end
end
