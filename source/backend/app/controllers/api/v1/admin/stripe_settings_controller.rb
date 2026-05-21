module Api
  module V1
    module Admin
      class StripeSettingsController < BaseController
        # Exact phrase the admin must type in production to flip live → test.
        # Intentionally accent-free and cedilla-free to avoid mobile/desktop
        # input-keyboard inconsistencies (premise from feature spec).
        PRODUCTION_TEST_PHRASE = "ATIVAR MODO TESTE EM PRODUCAO".freeze

        # GET /api/v1/admin/stripe_setting
        # Never returns plaintext credentials. Each key is reduced to a
        # boolean "configured" flag plus a 4-char hint for visual confirmation.
        def show
          setting = StripeSetting.current
          render json: {
            active_mode:    setting.active_mode,
            test:           credentials_summary(setting, "test"),
            live:           credentials_summary(setting, "live"),
            recent_changes: recent_changes_payload
          }
        end

        # PATCH /api/v1/admin/stripe_setting
        # Blank fields in the payload are dropped — existing credentials are
        # never overwritten by an empty input. To clear a credential, an
        # admin must update it to a new value (no UI affordance for clearing,
        # which is intentional).
        def update
          setting = StripeSetting.current
          attrs   = stripe_setting_params.to_h.reject { |_, v| v.blank? }

          if setting.update(attrs)
            head :no_content
          else
            render json: { errors: setting.errors.full_messages },
                   status: :unprocessable_entity
          end
        end

        # POST /api/v1/admin/stripe_setting/switch_mode
        # Atomically updates StripeSetting#active_mode and inserts a
        # StripeModeChange audit row in the same transaction.
        def switch_mode
          new_mode = params[:new_mode].to_s
          unless StripeSetting::ACTIVE_MODES.include?(new_mode)
            return render_error("Modo inválido", :unprocessable_entity)
          end

          setting = StripeSetting.current

          if setting.active_mode == new_mode
            return render_error("Modo já está ativo", :unprocessable_entity)
          end

          unless setting.keys_configured_for?(new_mode)
            missing = setting.missing_keys_for(new_mode).join(", ")
            return render_error(
              "Faltam credenciais para o modo #{new_mode}: #{missing}",
              :unprocessable_entity
            )
          end

          if Rails.env.production? && new_mode == "test"
            phrase = params[:confirmation_phrase].to_s.strip
            unless phrase == PRODUCTION_TEST_PHRASE
              return render_error(
                "Frase de confirmação incorreta",
                :unprocessable_entity
              )
            end
          end

          ActiveRecord::Base.transaction do
            previous = setting.active_mode
            setting.update!(active_mode: new_mode)
            StripeModeChange.create!(
              user:          current_admin,
              previous_mode: previous,
              new_mode:      new_mode,
              ip_address:    request.remote_ip,
              created_at:    Time.current
            )
          end

          head :no_content
        end

        private

        def stripe_setting_params
          params.require(:stripe_setting).permit(
            :test_publishable_key, :test_secret_key, :test_webhook_secret,
            :live_publishable_key, :live_secret_key, :live_webhook_secret
          )
        end

        def credentials_summary(setting, mode)
          StripeSetting::KEY_FIELDS.each_with_object({}) do |field, h|
            value = setting.public_send("#{mode}_#{field}").to_s
            h["#{field}_configured"] = value.present?
            h["#{field}_hint"]       = value.present? ? "••••#{value.last(4)}" : ""
          end
        end

        def recent_changes_payload
          StripeModeChange.includes(:user)
                          .order(created_at: :desc)
                          .limit(20)
                          .map do |change|
            {
              admin_email:   change.admin_email,
              previous_mode: change.previous_mode,
              new_mode:      change.new_mode,
              ip_address:    change.ip_address,
              created_at:    change.created_at.iso8601
            }
          end
        end

        def render_error(message, status)
          render json: { error: message }, status: status
        end
      end
    end
  end
end
