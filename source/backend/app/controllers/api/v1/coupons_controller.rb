module Api
  module V1
    # Public coupon validation endpoints. These do NOT consume the coupon —
    # actual consumption happens atomically inside PaymentsController#create_intent
    # via CouponApplier. These exist purely so the storefront can give the
    # buyer immediate feedback in the cart UI.
    class CouponsController < ApplicationController
      # POST /api/v1/coupons/validate
      # Body: { code, items: [{ variant_id, quantity }] }
      # Returns { valid, discount_cents, eligible_product_ids, total_cart_products,
      #          requires_email_validation } on success.
      def validate
        result = CouponValidator.new(
          code:       params[:code],
          cart_items: build_cart_items
        ).call

        if result.valid?
          render json: success_payload(result, include_requires_email: true)
        else
          render json: { valid: false, error: result.error }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/coupons/validate_with_email
      # Body: { code, email, items: [...] }
      def validate_with_email
        result = CouponValidator.new(
          code:       params[:code],
          cart_items: build_cart_items,
          email:      params[:email]
        ).call

        if result.valid?
          render json: success_payload(result, include_requires_email: false)
        else
          render json: { valid: false, error: result.error }, status: :unprocessable_entity
        end
      end

      private

      # Resolves the cart payload from the storefront into the structure the
      # validator expects. Mirrors the source-of-truth lookup used by
      # PaymentsController#create_intent: prices come from the variant, never
      # from the payload, so a tampered cart cannot inflate the discount.
      def build_cart_items
        raw = params[:items]
        return [] unless raw.respond_to?(:each)

        variant_ids = raw.map { |i| i[:variant_id].to_i }.uniq
        variants    = ProductVariant.includes(:product).where(id: variant_ids).index_by(&:id)

        raw.filter_map do |item|
          variant = variants[item[:variant_id].to_i]
          next unless variant&.product

          {
            product:           variant.product,
            variant:           variant,
            unit_price_cents:  variant.effective_price_cents,
            quantity:          [ item[:quantity].to_i, 1 ].max
          }
        end
      end

      def success_payload(result, include_requires_email:)
        payload = {
          valid:                result.valid?,
          discount_cents:       result.discount_cents,
          eligible_product_ids: result.eligible_items.map { |i| i[:product].id },
          total_cart_products:  params[:items].to_a.size
        }
        payload[:requires_email_validation] = true if include_requires_email
        payload
      end
    end
  end
end
