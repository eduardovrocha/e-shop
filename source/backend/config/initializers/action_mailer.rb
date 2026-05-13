# Configure SMTP from environment variables.
# In development, emails are silently dropped unless SMTP_HOST is set.
# In production, set all SMTP_* vars for delivery to work.
if ENV["SMTP_HOST"].present?
  Rails.application.config.action_mailer.delivery_method = :smtp
  Rails.application.config.action_mailer.perform_deliveries = true
  Rails.application.config.action_mailer.raise_delivery_errors = true
  Rails.application.config.action_mailer.smtp_settings = {
    address:              ENV.fetch("SMTP_HOST"),
    port:                 ENV.fetch("SMTP_PORT", "587").to_i,
    domain:               ENV.fetch("SMTP_DOMAIN", ENV.fetch("SMTP_HOST")),
    user_name:            ENV.fetch("SMTP_USERNAME", nil),
    password:             ENV.fetch("SMTP_PASSWORD", nil),
    authentication:       ENV.fetch("SMTP_AUTH", "plain").to_sym,
    enable_starttls_auto: ENV.fetch("SMTP_TLS", "true") == "true",
    open_timeout:         5,
    read_timeout:         10
  }.compact
  Rails.application.config.action_mailer.default_url_options = {
    host: ENV.fetch("HOST_URL", "http://localhost").sub(%r{^https?://}, "")
  }
end
