# Intentionally empty.
#
# Stripe credentials are no longer read from ENV at boot.
# Every call to Stripe::* now passes an explicit `api_key:` keyword sourced
# from StripeSetting.current.secret_key — see PaymentsController and
# ItemCancellationService. The webhook handler reads webhook secrets from
# the same singleton and supports active+opposite mode fallback.
#
# To configure Stripe, an admin must populate credentials via
# /admin/stripe in the dashboard.
