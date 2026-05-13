module Api
  module V1
    module Admin
      class CouponsController < BaseController
        def index
          render json: { coupons: Coupon.order(created_at: :desc) }
        end

        def show
          render json: Coupon.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Cupom não encontrado" }, status: :not_found
        end

        def create
          coupon = Coupon.new(coupon_params)
          if coupon.save
            render json: coupon, status: :created
          else
            render json: { errors: coupon.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          coupon = Coupon.find(params[:id])
          if coupon.update(coupon_params)
            render json: coupon
          else
            render json: { errors: coupon.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Cupom não encontrado" }, status: :not_found
        end

        def destroy
          Coupon.find(params[:id]).destroy
          head :no_content
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Cupom não encontrado" }, status: :not_found
        end

        private

        def coupon_params
          params.require(:coupon).permit(:code, :discount_type, :discount_value, :minimum_order_cents, :expires_at, :usage_limit, :active)
        end
      end
    end
  end
end
