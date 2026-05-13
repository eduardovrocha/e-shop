class ShippingSetting < ApplicationRecord
  encrypts :me_client_secret, :me_access_token, :me_refresh_token, deterministic: false

  validates :origin_zipcode, format: { with: /\A\d{5}-?\d{3}\z/, allow_blank: true }
  validates :global_extra_days,         numericality: { greater_than_or_equal_to: 0 }
  validates :global_extra_margin_pct,   numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :free_shipping_above_cents, numericality: { greater_than_or_equal_to: 0 }

  def self.instance
    first_or_create!(
      origin_zipcode: "",
      sender_name: "",
      sender_phone: "",
      sender_address: "",
      sender_number: "",
      sender_city: "",
      sender_state: "",
      me_client_id: "",
      me_sandbox: true,
      free_shipping_enabled: false,
      free_shipping_above_cents: 0,
      local_pickup_enabled: false,
      global_extra_days: 0,
      global_extra_margin_pct: 0
    )
  end

  def me_configured?
    me_access_token.present? && origin_zipcode.present?
  end

  def me_base_url
    me_sandbox? ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br"
  end
end
