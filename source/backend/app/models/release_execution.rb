class ReleaseExecution < ApplicationRecord
  belongs_to :user, optional: true

  validates :executed_at, presence: true
end
