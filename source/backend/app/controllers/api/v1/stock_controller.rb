module Api
  module V1
    class StockController < ApplicationController
      def check
        items   = params.require(:items)
        results = items.map { |item| check_item(item) }
        render json: { results: }
      end

      private

      def check_item(item)
        variant_id = item[:variant_id].to_i
        requested  = [item[:quantity].to_i, 1].max
        variant    = ProductVariant.includes(:product).find_by(id: variant_id)

        unless variant
          return { variant_id:, available: 0, valid: false,
                   message: "Produto não encontrado" }
        end

        available = variant.available_quantity
        valid     = available >= requested

        message = if valid
          nil
        elsif available == 0
          "#{variant.product.name} (#{variant.size}) está esgotado"
        else
          "Estoque atualizado: disponível apenas #{available} " \
          "unidade#{available != 1 ? 's' : ''} de " \
          "#{variant.product.name} (#{variant.size})"
        end

        { variant_id:, available:, valid:, message: }
      end
    end
  end
end
