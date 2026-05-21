module Api
  module V1
    module Admin
      class CouponsController < BaseController
        # GET /api/v1/admin/coupons
        # Optional filters: status (active|inactive|expired|scheduled|exhausted),
        # code_type (public|unique).
        def index
          coupons = Coupon.includes(:coupon_usages).order(created_at: :desc)
          coupons = coupons.where(code_type: params[:code_type]) if params[:code_type].present?

          payload = coupons.map { |c| index_summary(c) }
          payload = payload.select { |c| c[:status] == params[:status] } if params[:status].present?

          render json: { coupons: payload }
        end

        # GET /api/v1/admin/coupons/:id
        def show
          coupon = Coupon.includes(:products, :coupon_codes).find(params[:id])
          render json: detail_payload(coupon)
        end

        # POST /api/v1/admin/coupons
        def create
          coupon = Coupon.new(coupon_params)
          assign_products(coupon, params[:product_ids])

          if coupon.save
            render json: detail_payload(coupon), status: :created
          else
            render json: { errors: coupon.errors.full_messages },
                   status: :unprocessable_entity
          end
        end

        # PATCH /api/v1/admin/coupons/:id
        def update
          coupon = Coupon.find(params[:id])

          attrs = coupon_params
          if params[:product_ids].present? || params.key?(:product_ids)
            sync_products(coupon, params[:product_ids])
          end

          if coupon.update(attrs)
            render json: detail_payload(coupon)
          else
            render json: { errors: coupon.errors.full_messages },
                   status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/coupons/:id
        # Hard delete blocked once any usage exists — admin should deactivate.
        def destroy
          coupon = Coupon.find(params[:id])

          if coupon.coupon_usages.exists?
            return render json: {
              error: "Cupom possui usos registrados. Desative-o (active=false) em vez de apagar."
            }, status: :unprocessable_entity
          end

          coupon.destroy
          head :no_content
        end

        # POST /api/v1/admin/coupons/:id/generate_codes
        # Body: { quantity: 1..1000 }
        def generate_codes
          coupon = Coupon.find(params[:id])
          unless coupon.code_type == "unique"
            return render json: { error: "Apenas cupons do tipo 'unique' aceitam geração de códigos." },
                          status: :unprocessable_entity
          end

          quantity = params.require(:quantity).to_i
          if quantity < 1 || quantity > 1000
            return render json: { error: "Quantidade deve estar entre 1 e 1000." },
                          status: :unprocessable_entity
          end

          codes = []
          Coupon.transaction do
            quantity.times do
              codes << coupon.coupon_codes.create!(code: CouponCode.generate_unique_code)
            end
          end

          render json: { generated: codes.size, codes: codes.map(&:code) }
        end

        # GET /api/v1/admin/coupons/:id/usages
        # Query params: email, since, until, page (paginated 50/page).
        def usages
          coupon = Coupon.find(params[:id])
          scope  = coupon.coupon_usages.includes(:order).finalized.order(created_at: :desc)

          if params[:email].present?
            normalized = params[:email].to_s.downcase.strip
            scope = scope.where("email LIKE ?", "%#{normalized}%")
          end
          scope = scope.where("created_at >= ?", params[:since]) if params[:since].present?
          scope = scope.where("created_at <= ?", params[:until]) if params[:until].present?

          page     = [ params[:page].to_i, 1 ].max
          per_page = 50
          total    = scope.count
          rows     = scope.offset((page - 1) * per_page).limit(per_page)

          render json: {
            usages: rows.map { |u| usage_row(u) },
            page:        page,
            per_page:    per_page,
            total:       total,
            total_pages: (total / per_page.to_f).ceil
          }
        end

        private

        def coupon_params
          params.permit(
            :name, :discount_percent, :applies_to_sale_items,
            :code_type, :public_code, :scope_type,
            :starts_at, :expires_at,
            :total_usage_limit, :per_customer_limit,
            :active
          )
        end

        def assign_products(coupon, ids)
          return if ids.blank?
          ids.each { |product_id| coupon.coupon_products.build(product_id: product_id) }
        end

        def sync_products(coupon, ids)
          ids ||= []
          coupon.coupon_products.where.not(product_id: ids).destroy_all
          existing = coupon.coupon_products.pluck(:product_id).to_set
          (ids - existing.to_a).each do |product_id|
            coupon.coupon_products.create!(product_id: product_id)
          end
        end

        def index_summary(coupon)
          {
            id:                 coupon.id,
            name:               coupon.name,
            discount_percent:   coupon.discount_percent,
            code_type:          coupon.code_type,
            public_code:        coupon.public_code,
            unique_codes_count: coupon.code_type == "unique" ? coupon.coupon_codes.count : nil,
            scope_type:         coupon.scope_type,
            scope_products_count: coupon.scope_type == "specific_products" ? coupon.coupon_products.count : nil,
            starts_at:          coupon.starts_at&.iso8601,
            expires_at:         coupon.expires_at&.iso8601,
            total_usage_limit:  coupon.total_usage_limit,
            usages_count:       coupon.coupon_usages.finalized.count,
            active:             coupon.active,
            status:             coupon.derived_status
          }
        end

        def detail_payload(coupon)
          index_summary(coupon).merge(
            applies_to_sale_items: coupon.applies_to_sale_items,
            per_customer_limit:    coupon.per_customer_limit,
            product_ids:           coupon.coupon_products.pluck(:product_id),
            immutable_fields:      coupon.coupon_usages.exists? ? Coupon::IMMUTABLE_FIELDS_AFTER_USAGE : []
          )
        end

        def usage_row(usage)
          {
            id:                    usage.id,
            email:                 usage.email,
            order_id:              usage.order_id,
            order_number:          usage.order&.number,
            code_used:             usage.coupon_code&.code || usage.coupon.public_code,
            discount_amount_cents: usage.discount_amount_cents,
            created_at:            usage.created_at.iso8601
          }
        end
      end
    end
  end
end
