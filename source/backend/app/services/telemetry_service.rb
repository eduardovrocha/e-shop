class TelemetryService
  EVENTS = %w[
    tour_started
    tour_step_viewed
    tour_step_skipped
    tour_completed_phase_1
    tour_completed_phase_2
    tour_skipped_entirely
    tour_resumed
    tour_first_sale_after_completion
    onboarding_progress_reset
  ].freeze

  def self.track(event:, user_id: nil, store_setting_id: nil, properties: {})
    return unless EVENTS.include?(event)

    Rails.logger.info(
      [
        "[telemetry]",
        "event=#{event}",
        "user_id=#{user_id || '-'}",
        "store_setting_id=#{store_setting_id || '-'}",
        "props=#{properties.to_json}"
      ].join(" ")
    )
    true
  rescue StandardError => e
    Rails.logger.warn("[telemetry] failed to log event=#{event} error=#{e.class}: #{e.message}")
    false
  end
end
