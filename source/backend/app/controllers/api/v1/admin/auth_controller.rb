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
              retry_after: ttl
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
              # Parent-domain scope in prod so dashboard.* and api.* share
              # the cookie (needed for Action Cable WS handshake to /cable
              # served from dashboard.andrequice.store). Host-only in dev
              # because browsers reject the Domain attribute on localhost.
              domain:    Rails.env.production? ? ".andrequice.store" : nil
            }
            render json: {
              user: {
                id:    user.id,
                name:  user.name,
                email: user.email,
                role:  user.role
              }
            }
          else
            BruteForceProtection.record_failure(email)
            render json: { error: "Credenciais inválidas" }, status: :unauthorized
          end
        end

        def logout
          cookies.delete(:admin_token, domain: Rails.env.production? ? ".andrequice.store" : nil)
          head :no_content
        end
      end
    end
  end
end
