redis_config = {
  host: ENV.fetch("REDIS_HOST", "host.docker.internal"),
  port: ENV.fetch("REDIS_PORT", 6379).to_i,
  password: ENV.fetch("REDIS_PASSWORD", nil).presence,
  db: ENV.fetch("REDIS_DB", 0).to_i
}

if ENV.fetch("REDIS_SSL", "false") == "true"
  redis_config[:ssl] = true
  redis_config[:ssl_params] = { verify_mode: OpenSSL::SSL::VERIFY_PEER }
end

Sidekiq.configure_server do |config|
  config.redis = redis_config

  config.on(:startup) do
    Sidekiq.schedule = {
      "webhook_event_cleanup" => {
        "cron"  => "0 3 * * 0",
        "class" => "WebhookEventCleanupJob"
      }
    }
    SidekiqScheduler::Scheduler.instance.reload_schedule!
  end

  config.death_handlers << lambda do |job, ex|
    Rails.logger.error(
      "[Sidekiq][DEAD] class=#{job['class']} jid=#{job['jid']} " \
      "queue=#{job['queue']} retries=#{job['retry_count']} " \
      "error=#{ex.class}: #{ex.message}"
    )
    Sentry.capture_exception(ex, extra: { sidekiq_job: job }) if defined?(Sentry) && Sentry.initialized?
  end
end

Sidekiq.configure_client { |c| c.redis = redis_config }
