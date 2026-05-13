# CORS_ORIGINS é validada como obrigatória em produção via
# config/initializers/required_env.rb.
# Se ausente, a aplicação não sobe — não há fallback para string vazia.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.development?
      # Em development aceita qualquer origem localhost ou IP de rede privada
      # (192.168.x.x, 10.x.x.x, 172.16-31.x.x) para permitir acesso via LAN/mobile
      origins do |source, _env|
        source.match?(%r{\Ahttps?://(
          localhost |
          127\.0\.0\.1 |
          192\.168\.\d{1,3}\.\d{1,3} |
          10\.\d{1,3}\.\d{1,3}\.\d{1,3} |
          172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}
        )(:\d+)?\z}x)
      end
    else
      origins ENV.fetch("CORS_ORIGINS", "").split(",").map(&:strip)
    end

    resource "*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      credentials: true
  end
end
