module Api
  module V1
    class ProductsController < ApplicationController
      include ImageSerializable

      def index
        products = Product.includes(:variants, images_attachments: :blob).active.order(created_at: :desc)
        render json: { products: products.map { |p| product_json(p) } }
      end

      def show
        product = Product.includes(:variants, images_attachments: :blob).active.find(params[:id])
        render json: product_json(product)
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Produto não encontrado" }, status: :not_found
      end

      private

      def product_json(product)
        PublicProductSerializer.new(product, image_urls: image_urls(product)).as_json
      end
    end
  end
end
