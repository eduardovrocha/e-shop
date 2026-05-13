class CustomerAddress < ApplicationRecord
  belongs_to :customer

  before_save :normalize_fields

  private

  def normalize_fields
    self.zipcode = zipcode.to_s.gsub(/\D/, "")
    self.state   = state.to_s.strip.upcase
    self.country = "BR" if country.blank?
  end
end
