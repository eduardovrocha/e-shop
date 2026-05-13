Rack::Attack.throttle("orders/track/ip", limit: 30, period: 60) do |req|
  req.ip if req.path.start_with?("/api/v1/orders/track/") && req.get?
end

Rack::Attack.throttle("payments/create_intent/ip", limit: 5, period: 60) do |req|
  req.ip if req.path == "/api/v1/payments/create_intent" && req.post?
end

Rack::Attack.throttle("api/ip", limit: 120, period: 60) do |req|
  req.ip if req.path.start_with?("/api/")
end

class Rack::Attack
  throttle("admin_login/ip", limit: 5, period: 60) do |req|
    req.ip if req.path == "/api/v1/admin/auth/login" && req.post?
  end

  self.throttled_responder = lambda do |_env|
    [
      429,
      { "Content-Type" => "application/json" },
      ['{"error":"Muitas tentativas. Aguarde 60 segundos."}'],
    ]
  end
end
