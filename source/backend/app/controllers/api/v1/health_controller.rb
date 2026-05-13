module Api
  module V1
    class HealthController < ApplicationController
      def show
        db_ok    = check_database
        redis_ok = check_redis
        all_ok   = db_ok && redis_ok

        render json: {
          status:  all_ok ? "ok" : "degraded",
          checks:  { database: db_ok, redis: redis_ok },
          version: ENV.fetch("APP_VERSION", "dev"),
        }, status: all_ok ? :ok : :service_unavailable
      end

      private

      def check_database
        ActiveRecord::Base.connection.execute("SELECT 1")
        true
      rescue => e
        Rails.logger.error "[Health] DB check failed: #{e.message}"
        false
      end

      def check_redis
        REDIS.ping == "PONG"
      rescue => e
        Rails.logger.error "[Health] Redis check failed: #{e.message}"
        false
      end
    end
  end
end
