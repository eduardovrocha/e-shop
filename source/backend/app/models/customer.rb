class Customer < ApplicationRecord
  has_many :addresses, class_name: "CustomerAddress", dependent: :destroy
  has_many :orders, dependent: :nullify

  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :name,  presence: true

  before_validation :normalize_fields

  private

  def normalize_fields
    self.email = email.to_s.strip.downcase
    self.name  = name.to_s.strip.split.map(&:capitalize).join(" ")
    self.phone = phone.to_s.gsub(/\D/, "")
  end
end
