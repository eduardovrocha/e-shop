class StripeSetting < ApplicationRecord
  ACTIVE_MODES = %w[test live].freeze
  KEY_FIELDS   = %w[publishable_key secret_key webhook_secret].freeze

  encrypts :test_publishable_key, :test_secret_key, :test_webhook_secret,
           :live_publishable_key, :live_secret_key, :live_webhook_secret,
           deterministic: false

  validates :active_mode, inclusion: { in: ACTIVE_MODES }

  def self.current
    first_or_create!(active_mode: "test")
  end

  def publishable_key
    public_send("#{active_mode}_publishable_key")
  end

  def secret_key
    public_send("#{active_mode}_secret_key")
  end

  def webhook_secret
    public_send("#{active_mode}_webhook_secret")
  end

  def opposite_mode
    active_mode == "test" ? "live" : "test"
  end

  def opposite_webhook_secret
    public_send("#{opposite_mode}_webhook_secret")
  end

  def keys_configured_for?(mode)
    raise ArgumentError, "invalid mode: #{mode}" unless ACTIVE_MODES.include?(mode)
    KEY_FIELDS.all? { |field| public_send("#{mode}_#{field}").present? }
  end

  def missing_keys_for(mode)
    raise ArgumentError, "invalid mode: #{mode}" unless ACTIVE_MODES.include?(mode)
    KEY_FIELDS.reject { |field| public_send("#{mode}_#{field}").present? }
  end
end
