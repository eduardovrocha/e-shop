module Api
  module V1
    module Admin
      class AuthController < ApplicationController
        def login
          email = params[:email]&.strip&.downcase

          if BruteForceProtection.locked?(email)
            ttl = BruteForceProtection.ttl(email)
            minutes = (ttl / 60.0).ceil
            return render json: {
              error: "Conta bloqueada. Tente novamente em #{minutes} minuto(s).",
              retry_after: ttl,
            }, status: :too_many_requests
          end

          user = User.find_by(email: email)

          if user&.authenticate(params[:password]) && user.role.in?(%w[admin super_admin])
            BruteForceProtection.reset(email)
            token = JwtService.encode({ user_id: user.id, role: user.role })
            cookies.signed[:admin_token] = {
              value:     token,
              httponly:  true,
              secure:    Rails.env.production?,
              same_site: :strict,
              expires:   24.hours.from_now,
            }
            render json: {
              user: {
                id:    user.id,
                name:  user.name,
                email: user.email,
                role:  user.role,
              },
            }
          else
            BruteForceProtection.record_failure(email)
            render json: { error: "Credenciais inválidas" }, status: :unauthorized
          end
        end

        def logout
          cookies.delete(:admin_token)
          head :no_content
        end
      end
    end
  end
end
