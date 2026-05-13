class ProcessedWebhookEvent < ApplicationRecord
  validates :stripe_event_id, presence: true, uniqueness: true
  validates :event_type, :processed_at, presence: true

  def self.already_processed?(event_id)
    exists?(stripe_event_id: event_id)
  end

  def self.mark_processed!(event_id, event_type)
    create!(
      stripe_event_id: event_id,
      event_type: event_type,
      processed_at: Time.current
    )
  end
end
