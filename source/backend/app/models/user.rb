class User < ApplicationRecord
  has_secure_password

  ROLES = %w[admin super_admin].freeze

  validates :name,  presence: true
  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, inclusion: { in: ROLES }

  before_validation { email&.downcase! }

  scope :admins, -> { where(role: %w[admin super_admin]) }
end
