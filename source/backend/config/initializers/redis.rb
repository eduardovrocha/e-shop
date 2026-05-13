redis_opts = {
  host: ENV.fetch("REDIS_HOST", "host.docker.internal"),
  port: ENV.fetch("REDIS_PORT", 6379).to_i,
  password: ENV.fetch("REDIS_PASSWORD", nil).presence,
  db: ENV.fetch("REDIS_DB", 0).to_i
}

if ENV.fetch("REDIS_SSL", "false") == "true"
  redis_opts[:ssl] = true
  redis_opts[:ssl_params] = { verify_mode: OpenSSL::SSL::VERIFY_PEER }
end

REDIS = Redis.new(**redis_opts)
