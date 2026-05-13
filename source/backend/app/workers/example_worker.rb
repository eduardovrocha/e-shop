class ExampleWorker
  include Sidekiq::Worker

  sidekiq_options queue: :default, retry: 3

  def perform(args = {})
    Rails.logger.info "ExampleWorker executed with: #{args.inspect}"
  end
end
