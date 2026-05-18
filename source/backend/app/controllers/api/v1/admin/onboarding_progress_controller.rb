module Api
  module V1
    module Admin
      class OnboardingProgressController < BaseController
        before_action :load_progress

        # GET /api/v1/admin/onboarding/progress
        def show
          @progress.touch_last_seen
          @progress.save! if @progress.changed?
          render json: serialize(@progress)
        end

        # PATCH /api/v1/admin/onboarding/progress
        def update
          @progress.assign_attributes(allowed_update_attrs)

          if params[:completed_step].present?
            @progress.add_completed_step(params[:completed_step])
            TelemetryService.track(
              event:            "tour_step_viewed",
              user_id:          current_admin.id,
              store_setting_id: store_setting.id,
              properties:       { step_id: params[:completed_step], phase: @progress.current_phase }
            )
          end

          if params[:skipped_step].present?
            @progress.add_skipped_step(params[:skipped_step])
            TelemetryService.track(
              event:            "tour_step_skipped",
              user_id:          current_admin.id,
              store_setting_id: store_setting.id,
              properties:       { step_id: params[:skipped_step], phase: @progress.current_phase }
            )
          end

          @progress.touch_last_seen

          if @progress.save
            render json: serialize(@progress)
          else
            render json: { errors: @progress.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # POST /api/v1/admin/onboarding/progress/start
        def start
          was_resumed = @progress.status == "in_progress"
          @progress.touch_last_seen
          @progress.mark_started!

          TelemetryService.track(
            event:            was_resumed ? "tour_resumed" : "tour_started",
            user_id:          current_admin.id,
            store_setting_id: store_setting.id,
            properties:       { current_step_id: @progress.current_step_id }
          )

          render json: serialize(@progress)
        end

        # POST /api/v1/admin/onboarding/progress/complete-phase
        def complete_phase
          phase = params[:phase].to_i
          return render(json: { error: "invalid phase" }, status: :unprocessable_entity) unless OnboardingProgress::PHASES.include?(phase)

          @progress.touch_last_seen
          @progress.mark_completed_phase!(phase)

          TelemetryService.track(
            event:            phase == 1 ? "tour_completed_phase_1" : "tour_completed_phase_2",
            user_id:          current_admin.id,
            store_setting_id: store_setting.id,
            properties:       { completed_at: @progress.completed_at }
          )

          render json: serialize(@progress)
        end

        # POST /api/v1/admin/onboarding/progress/skip
        def skip
          permanently = ActiveModel::Type::Boolean.new.cast(params[:permanently])

          if permanently
            @progress.status = "skipped"
            TelemetryService.track(
              event:            "tour_skipped_entirely",
              user_id:          current_admin.id,
              store_setting_id: store_setting.id,
              properties:       { last_step_id: @progress.current_step_id }
            )
          else
            @progress.status = "in_progress" if @progress.status == "not_started"
          end

          @progress.touch_last_seen
          @progress.save!

          render json: serialize(@progress)
        end

        # POST /api/v1/admin/onboarding/progress/reset
        def reset
          return render(json: { error: "forbidden" }, status: :forbidden) unless current_admin.role == "super_admin"

          target_user_id = params[:user_id].presence || current_admin.id
          progress = OnboardingProgress.find_or_initialize_by(
            user_id:          target_user_id,
            store_setting_id: store_setting.id
          )

          progress.assign_attributes(
            status:           "not_started",
            current_phase:    1,
            current_step_id:  nil,
            completed_steps:  [],
            skipped_steps:    [],
            started_at:       nil,
            completed_at:     nil,
            last_seen_at:     nil
          )
          progress.save!

          Rails.logger.info(
            "[audit] onboarding_progress_reset by_user_id=#{current_admin.id} target_user_id=#{target_user_id} store_setting_id=#{store_setting.id} at=#{Time.current.iso8601}"
          )
          TelemetryService.track(
            event:            "onboarding_progress_reset",
            user_id:          current_admin.id,
            store_setting_id: store_setting.id,
            properties:       { target_user_id: target_user_id }
          )

          render json: serialize(progress)
        end

        # POST /api/v1/admin/onboarding/events/first-sale
        # Idempotent: moves every admin that already finished Phase 1 to phase_2_ready.
        # Users still in_progress / skipped / not_started are not touched.
        def first_sale
          affected = OnboardingProgress.fire_first_sale!(store_setting: store_setting)

          if affected.positive?
            TelemetryService.track(
              event:            "tour_first_sale_after_completion",
              user_id:          nil,
              store_setting_id: store_setting.id,
              properties:       { affected: affected, source: "manual_endpoint" }
            )
          end

          render json: { affected: affected }
        end

        private

        def load_progress
          return if action_name == "first_sale" # operates over all rows

          @progress = OnboardingProgress.find_or_create_by!(
            user_id:          current_admin.id,
            store_setting_id: store_setting.id
          ) do |p|
            p.status        = "not_started"
            p.current_phase = 1
          end
        end

        def store_setting
          @store_setting ||= StoreSetting.instance
        end

        def allowed_update_attrs
          params.permit(:status, :current_phase, :current_step_id).to_h.tap do |h|
            if h[:status].present? && !OnboardingProgress::STATUSES.include?(h[:status])
              h.delete(:status)
            end
          end
        end

        def serialize(progress)
          {
            status:                    progress.status,
            current_phase:             progress.current_phase,
            current_step_id:           progress.current_step_id,
            completed_steps:           Array(progress.completed_steps),
            skipped_steps:             Array(progress.skipped_steps),
            started_at:                progress.started_at,
            completed_at:              progress.completed_at,
            last_seen_at:              progress.last_seen_at,
            next_eligible_phase_2_at:  nil
          }
        end
      end
    end
  end
end
