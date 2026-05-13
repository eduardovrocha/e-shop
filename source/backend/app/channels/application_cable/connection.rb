module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_admin

    def connect
      self.current_admin = find_verified_admin
    end

    private

    def find_verified_admin
      # Cookies are forwarded automatically in the WebSocket handshake so
      # the same signed cookie used by the REST API works here.
      token = cookies.signed[:admin_token]
      reject_unauthorized_connection unless token.present?

      payload = JwtService.decode(token)
      reject_unauthorized_connection unless payload

      user = User.find_by(id: payload["user_id"])
      reject_unauthorized_connection unless user&.role.in?(%w[admin super_admin])

      user
    rescue StandardError
      reject_unauthorized_connection
    end
  end
end
