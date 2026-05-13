# Ensure required ENV vars are present for test suite
ENV["STRIPE_WEBHOOK_SECRET"] ||= "whsec_test_secret_for_specs"
ENV["JWT_SECRET"]            ||= "test_jwt_secret_for_specs_only"
ENV["SUPPORT_EMAIL"]         ||= "test@example.com"
ENV["HOST_URL"]              ||= "http://localhost"
