module Api
  module V1
    class TrackingController < ApplicationController
      TOKEN_FORMAT = /\A[\w\-]{10,50}\z/

      def show
        token = params[:token].to_s.strip

        unless token.match?(TOKEN_FORMAT)
          return render json: { error: "Token inválido" }, status: :bad_request
        end

        order = Order.includes(:status_histories)
                     .find_by(tracking_token: token)

        if order
          render json: TrackingPayloadSerializer.new(order).as_json
        else
          render json: { error: "Pedido não encontrado" }, status: :not_found
        end
      end
    end
  end
end
