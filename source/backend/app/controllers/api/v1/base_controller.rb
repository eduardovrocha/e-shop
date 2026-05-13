module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_request!

      private

      def authenticate_request!
        token = cookies.signed[:admin_token] ||
                request.headers["Authorization"]&.split(" ")&.last
        return unauthorized! unless token

        payload = JwtService.decode(token)
        return unauthorized! unless payload

        @current_user_id = payload["user_id"]
      rescue StandardError
        unauthorized!
      end

      def unauthorized!
        render json: { error: "Unauthorized" }, status: :unauthorized
      end

      def current_user_id
        @current_user_id
      end
    end
  end
end
