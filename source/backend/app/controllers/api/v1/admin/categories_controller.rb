module Api
  module V1
    module Admin
      class CategoriesController < BaseController
        def index
          render json: Category.all.map { |c| serialize(c) }
        end

        def create
          category = Category.new(
            name:     params[:name].to_s.strip.downcase,
            position: Category.count
          )
          if category.save
            render json: serialize(category), status: :created
          else
            render json: { errors: category.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          category = Category.find(params[:id])
          old_name = category.name
          new_name = params[:name].to_s.strip.downcase

          if category.update(name: new_name)
            # Keep existing products in sync when a category is renamed
            Product.where(category: old_name).update_all(category: new_name) if old_name != new_name
            render json: serialize(category)
          else
            render json: { errors: category.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          category = Category.find(params[:id])
          count    = Product.where(category: category.name).count

          if count > 0
            render json: {
              error:          "Categoria possui #{count} produto(s) vinculado(s). Reatribua-os antes de excluir.",
              products_count: count
            }, status: :unprocessable_entity
            return
          end

          category.destroy
          head :no_content
        end

        def reorder
          Array(params[:order]).each do |item|
            Category.where(id: item[:id]).update_all(position: item[:position].to_i)
          end
          head :no_content
        end

        private

        def serialize(category)
          {
            id:             category.id,
            name:           category.name,
            position:       category.position,
            products_count: Product.where(category: category.name).count
          }
        end
      end
    end
  end
end
