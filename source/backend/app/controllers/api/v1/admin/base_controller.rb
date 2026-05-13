module Api
  module V1
    module Admin
      class BaseController < Api::V1::BaseController
        before_action :require_admin!

        private

        def require_admin!
          @current_admin = User.find_by(id: current_user_id)
          return unauthorized! unless @current_admin&.role.in?(%w[admin super_admin])
        end

        def current_admin
          @current_admin
        end
      end
    end
  end
end
