class JwtService
  SECRET = ENV.fetch("JWT_SECRET") do
    raise ArgumentError, "JWT_SECRET env var é obrigatória" if Rails.env.production?
    "dev_jwt_secret_change_me_before_production"
  end
  ALGORITHM = "HS256"
  EXPIRY = 24.hours

  def self.encode(payload)
    payload[:exp] = EXPIRY.from_now.to_i
    JWT.encode(payload, SECRET, ALGORITHM)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET, true, algorithm: ALGORITHM)
    decoded.first
  rescue JWT::DecodeError, JWT::ExpiredSignature
    nil
  end
end
