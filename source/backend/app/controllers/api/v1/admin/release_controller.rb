module Api
  module V1
    module Admin
      class ReleaseController < BaseController
        # Exact phrase the admin must type to fire the wipe. Backend
        # revalidates this — never trust the frontend modal alone.
        WIPE_CONFIRMATION_PHRASE = "ZERAR DADOS PARA RELEASE".freeze

        # GET /api/v1/admin/release
        # Returns whether the wipe was already executed and (if so) the
        # last execution's audit row. Frontend uses this to enable/disable
        # the trigger button.
        def show
          last = ReleaseExecution.order(executed_at: :desc).first
          render json: {
            already_executed: last.present?,
            rewipe_allowed:   ENV["ALLOW_RELEASE_REWIPE"] == "yes",
            last_execution:   last && {
              executed_at:         last.executed_at.iso8601,
              admin_email:         last.user&.email,
              ip_address:          last.ip_address,
              orders_deleted:      last.orders_deleted,
              order_items_deleted: last.order_items_deleted,
              customers_deleted:   last.customers_deleted
            }
          }
        end

        # POST /api/v1/admin/release/wipe
        # Body: { confirmation_phrase: "ZERAR DADOS PARA RELEASE" }
        # Only super_admins may fire — admin role is not enough.
        def wipe
          unless current_admin.role == "super_admin"
            return render json: { error: "Apenas super_admin pode executar o release wipe." },
                          status: :forbidden
          end

          phrase = params[:confirmation_phrase].to_s.strip
          unless phrase == WIPE_CONFIRMATION_PHRASE
            return render json: { error: "Frase de confirmação incorreta." },
                          status: :unprocessable_entity
          end

          result = ReleaseWipeService.call(
            user:       current_admin,
            ip_address: request.remote_ip
          )

          if result.ok?
            render json: {
              ok:          true,
              counts:      result.counts,
              executed_at: result.execution.executed_at.iso8601
            }
          else
            render json: { error: result.error }, status: :unprocessable_entity
          end
        end
      end
    end
  end
end
