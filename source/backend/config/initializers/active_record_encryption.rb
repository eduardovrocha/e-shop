primary_key   = ENV["ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY"].presence
det_key       = ENV["ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY"].presence
derivation    = ENV["ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT"].presence

if primary_key && det_key && derivation
  Rails.application.config.active_record.encryption.primary_key         = primary_key
  Rails.application.config.active_record.encryption.deterministic_key   = det_key
  Rails.application.config.active_record.encryption.key_derivation_salt = derivation
elsif Rails.env.production?
  raise "Missing Active Record Encryption keys. Set ACTIVE_RECORD_ENCRYPTION_* environment variables."
end
