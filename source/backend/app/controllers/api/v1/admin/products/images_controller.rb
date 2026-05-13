module Api
  module V1
    module Admin
      module Products
        class ImagesController < BaseController
          include ImageSerializable

          before_action :load_product

          def create
            files = Array(params[:images]).compact
            return render json: { error: "Nenhuma imagem enviada" }, status: :unprocessable_entity if files.empty?

            upload_errors = []
            current_count = @product.images.blobs.count

            files.each do |file|
              if current_count >= Product::MAX_IMAGES
                upload_errors << "Limite de #{Product::MAX_IMAGES} imagens atingido"
                break
              end

              unless Product::ALLOWED_CONTENT_TYPES.include?(file.content_type)
                upload_errors << "#{file.original_filename}: formato não permitido (use JPG, PNG ou WebP)"
                next
              end

              if file.size > Product::MAX_SIZE
                upload_errors << "#{file.original_filename}: excede 5 MB"
                next
              end

              blob = ActiveStorage::Blob.create_and_upload!(
                io:           file,
                filename:     file.original_filename,
                content_type: file.content_type,
              )

              @product.images.attach(blob)
              @product.image_order = (@product.image_order + [blob.id]).uniq
              current_count += 1
            end

            @product.save!

            response_body = { images: serialize_images(@product) }
            response_body[:warnings] = upload_errors if upload_errors.any?

            render json: response_body, status: :ok
          end

          def destroy
            blob = find_blob!
            return unless blob

            blob.attachments.each(&:purge)
            @product.update!(image_order: @product.image_order.reject { |id| id == blob.id })

            render json: { images: serialize_images(@product) }
          end

          def reorder
            order = Array(params[:order]).map(&:to_i)
            valid_ids = @product.images.blobs.pluck(:id)
            ordered = order.select { |id| valid_ids.include?(id) }
            remaining = valid_ids - ordered
            @product.update!(image_order: ordered + remaining)
            render json: { images: serialize_images(@product) }
          end

          def primary
            blob = find_blob!
            return unless blob

            current_order = @product.image_order.presence || @product.images.blobs.pluck(:id)
            new_order = [blob.id] + current_order.reject { |id| id == blob.id }
            @product.update!(image_order: new_order)
            render json: { images: serialize_images(@product) }
          end

          private

          def load_product
            @product = Product.find(params[:product_id])
          rescue ActiveRecord::RecordNotFound
            render json: { error: "Produto não encontrado" }, status: :not_found
          end

          def find_blob!
            blob = @product.images.blobs.find_by(id: params[:id])
            render json: { error: "Imagem não encontrada" }, status: :not_found unless blob
            blob
          end
        end
      end
    end
  end
end
