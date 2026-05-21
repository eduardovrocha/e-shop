# Ensure required ENV vars are present for test suite.
# Stripe webhook/secret credentials moved into the encrypted stripe_settings
# table — tests stub StripeSetting.current as needed.
ENV["JWT_SECRET"]            ||= "test_jwt_secret_for_specs_only"
ENV["SUPPORT_EMAIL"]         ||= "test@example.com"
ENV["HOST_URL"]              ||= "http://localhost"
