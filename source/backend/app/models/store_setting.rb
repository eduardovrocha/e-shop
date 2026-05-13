class StoreSetting < ApplicationRecord
  CACHE_KEY = "store_settings:singleton"
  CACHE_TTL = 1.hour

  validates :headline_primary,     presence: true, length: { maximum: 80 }
  validates :headline_secondary,   presence: true, length: { maximum: 80 }
  validates :headline_description, presence: true, length: { maximum: 200 }
  validates :footer_description,   presence: true, length: { maximum: 200 }

  def self.instance
    Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL) do
      first_or_create!(
        event_name:                "Festa de Andrequicé",
        edition:                   "2025",
        contact_email:             "",
        pickup_address:            "",
        pickup_zipcode:            "",
        pickup_street:             "",
        pickup_number:             "",
        pickup_complement:         "",
        pickup_city:               "",
        pickup_state:              "",
        whatsapp_number:           "",
        free_shipping_above_cents: 15_000,
        shipping_fee_cents:        1_500,
        headline_primary:          "Nossa história,",
        headline_secondary:        "nossa devoção.",
        headline_description:      "Camisetas artesanais da Festa de Andrequicé. Arte, fé e tradição em cada peça.",
        footer_description:        "Camisetas artesanais da Festa de Andrequicé — fé, tradição e arte do interior de Minas Gerais."
      )
    end
  end

  after_commit :bust_cache

  private

  def bust_cache
    Rails.cache.delete(CACHE_KEY)
  end
end
