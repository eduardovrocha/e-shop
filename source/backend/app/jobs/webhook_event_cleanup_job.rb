class WebhookEventCleanupJob < ApplicationJob
  queue_as :default

  def perform
    deleted = ProcessedWebhookEvent.where("processed_at < ?", 90.days.ago).delete_all
    Rails.logger.info "[WebhookCleanup] Removidos #{deleted} eventos processados há mais de 90 dias"
  end
end
