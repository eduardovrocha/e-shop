class StripeRawBodyMiddleware
  WEBHOOK_PATH = "/api/v1/payments/webhook"

  def initialize(app)
    @app = app
  end

  def call(env)
    if env["PATH_INFO"] == WEBHOOK_PATH
      raw = env["rack.input"].read
      env["RAW_POST_DATA"] = raw
      env["rack.input"] = StringIO.new(raw)
    end
    @app.call(env)
  end
end
