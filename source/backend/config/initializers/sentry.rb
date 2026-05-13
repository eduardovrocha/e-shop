Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]

  # Capture breadcrumbs from Rails logs and HTTP calls
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]

  # Trace 20% of production requests for performance monitoring
  config.traces_sample_rate = Rails.env.production? ? 0.2 : 0.0

  # Only capture in production/staging — silent in development and test
  config.enabled_environments = %w[production staging]

  # Scrub sensitive parameters from reports
  config.send_default_pii = false
  config.before_send = lambda do |event, _hint|
    event
  end
end
