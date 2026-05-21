class CouponCode < ApplicationRecord
  belongs_to :coupon
  has_many :coupon_usages, dependent: :nullify

  validates :code, presence: true, uniqueness: { case_sensitive: false }

  before_validation :normalize_code

  # Generates a candidate not currently in `coupon_codes.code`. Defensive
  # loop — alphanumeric(length: 10).upcase yields ~3.6e15 possibilities, so
  # collision is vanishingly rare, but the loop guarantees correctness even
  # with shorter lengths or after large batches.
  def self.generate_unique_code(length: 10)
    loop do
      candidate = SecureRandom.alphanumeric(length).upcase
      return candidate unless exists?(code: candidate)
    end
  end

  private

  def normalize_code
    self.code = code.to_s.strip.upcase.presence
  end
end
