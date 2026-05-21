class StripeModeChange < ApplicationRecord
  belongs_to :user

  validates :previous_mode, :new_mode, presence: true
  validates :new_mode, inclusion: { in: StripeSetting::ACTIVE_MODES }

  def admin_email
    user&.email
  end
end
