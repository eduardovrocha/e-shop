module Api
  module V1
    module Admin
      class ProductsController < BaseController
        include ImageSerializable

        def index
          products = Product.includes(:variants, images_attachments: :blob).order(created_at: :desc)
          products = products.where(active: params[:active] == "true") if params[:active].present?
          if params[:search].present?
            products = products.where("name ILIKE ?", "%#{params[:search]}%")
          end
          paginated = products.page(params[:page]).per(params[:per_page] || 10)

          render json: {
            products: paginated.map { |p| product_json(p) },
            meta: pagination_meta(paginated),
          }
        end

        def show
          render json: product_json(Product.includes(:variants, images_attachments: :blob).find(params[:id]))
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Produto não encontrado" }, status: :not_found
        end

        def create
          product = Product.new(product_params)
          if product.save
            render json: product_json(product.reload), status: :created
          else
            render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          product = Product.includes(:variants).find(params[:id])
          if product.update(product_params)
            render json: product_json(product.reload)
          else
            render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Produto não encontrado" }, status: :not_found
        end

        def destroy
          Product.find(params[:id]).destroy
          head :no_content
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Produto não encontrado" }, status: :not_found
        end

        # PATCH /api/v1/admin/products/:id/stock
        def stock
          product = Product.includes(:variants).find(params[:id])

          Array(params[:variants]).each do |v|
            variant = product.variants.find_by(id: v[:id])
            next unless variant

            qty = v[:stock_quantity].to_i
            if qty < 0
              render json: { error: "Estoque não pode ser negativo" }, status: :unprocessable_entity
              return
            end
            variant.update!(stock_quantity: qty)
          end

          render json: product_json(product.reload)
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Produto não encontrado" }, status: :not_found
        end

        # GET /api/v1/admin/products/inventory
        def inventory
          variants = ProductVariant.joins(:product)
                                   .includes(:product)
                                   .order(stock_quantity: :asc)

          if params[:search].present?
            search = "%#{params[:search]}%"
            variants = variants.where(
              "product_variants.sku ILIKE :q OR products.name ILIKE :q", q: search
            )
          end

          paginated = variants.page(params[:page]).per(params[:per_page] || 20)

          render json: {
            variants: paginated.map { |v|
              {
                id:                 v.id,
                product:            v.product.name,
                product_id:         v.product_id,
                sku:                v.sku,
                size:               v.size,
                color:              v.color,
                stock:              v.stock_quantity,
                reserved:           v.reserved_quantity,
                available:          v.available_quantity,
              }
            },
            meta: pagination_meta(paginated),
          }
        end

        private

        def product_params
          params.require(:product).permit(
            :name, :description, :price_cents, :category, :slug, :active,
            :weight_g, :height_mm, :width_mm, :length_mm,
            variants_attributes: [ :id, :size, :color, :sku, :stock_quantity, :price_cents, :additional_price_cents, :_destroy ]
          )
        end

        def product_json(product)
          ::Admin::ProductSerializer.new(product, images: serialize_images(product)).as_json
        end

        def pagination_meta(collection)
          {
            current_page: collection.current_page,
            total_pages:  collection.total_pages,
            total_count:  collection.total_count,
            per_page:     collection.limit_value,
          }
        end
      end
    end
  end
end
