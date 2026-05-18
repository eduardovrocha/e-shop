module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_admin

    def connect
      self.current_admin = find_verified_admin
    end

    private

    def find_verified_admin
      # Cookies are forwarded automatically in the WebSocket handshake so
      # the same signed cookie used by the REST API works here. JwtService
      # already swallows JWT::DecodeError/ExpiredSignature → nil, and
      # cookies.signed / User.find_by return nil on miss, so no rescue
      # needed (an old `rescue StandardError` here was catching the
      # UnauthorizedError raised by reject_unauthorized_connection and
      # re-rejecting, producing duplicate log lines per attempt).
      token = cookies.signed[:admin_token]
      reject_unauthorized_connection unless token.present?

      payload = JwtService.decode(token)
      reject_unauthorized_connection unless payload

      user = User.find_by(id: payload["user_id"])
      reject_unauthorized_connection unless user&.role.in?(%w[admin super_admin])

      user
    end
  end
end
