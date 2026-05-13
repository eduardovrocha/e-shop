module Admin
  class ProductSerializer
    def initialize(product, images: [])
      @product = product
      @images  = images
    end

    def as_json(*)
      {
        id:             @product.id,
        name:           @product.name,
        description:    @product.description,
        price_cents:    @product.price_cents,
        category:       @product.category,
        slug:           @product.slug,
        active:         @product.active,
        created_at:     @product.created_at,
        updated_at:     @product.updated_at,
        weight_g:       @product.weight_g,
        height_mm:      @product.height_mm,
        width_mm:       @product.width_mm,
        length_mm:      @product.length_mm,
        total_stock:    @product.total_stock,
        has_dimensions: @product.has_dimensions?,
        images:         @images,
        variants:       serialize_variants,
      }
    end

    private

    def serialize_variants
      @product.variants.map do |v|
        {
          id:                     v.id,
          size:                   v.size,
          color:                  v.color,
          sku:                    v.sku,
          stock_quantity:         v.stock_quantity,
          reserved_quantity:      v.reserved_quantity,
          price_cents:            v.price_cents,
          additional_price_cents: v.additional_price_cents,
          available_quantity:     v.available_quantity,
          effective_price_cents:  v.effective_price_cents,
        }
      end
    end
  end
end
