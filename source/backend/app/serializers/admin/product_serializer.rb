module Admin
  class ProductSerializer
    def initialize(product, images: [])
      @product = product
      @images  = images
    end

    def as_json(*)
      {
        id:                             @product.id,
        name:                           @product.name,
        description:                    @product.description,
        price_cents:                    @product.price_cents,
        category:                       @product.category,
        slug:                           @product.slug,
        active:                         @product.active,
        created_at:                     @product.created_at,
        updated_at:                     @product.updated_at,
        weight_g:                       @product.weight_g,
        height_mm:                      @product.height_mm,
        width_mm:                       @product.width_mm,
        length_mm:                      @product.length_mm,
        compare_at_price_cents:         @product.compare_at_price_cents,
        total_stock:                    @product.total_stock,
        has_dimensions:                 @product.has_dimensions?,
        images:                         @images,
        variants:                       serialize_variants,
        fulfillment_mode:               @product.fulfillment_mode,
        production_lead_time_days:      @product.production_lead_time_days,
        production_capacity:            @product.production_capacity,
        cancellation_refund_percentage: @product.cancellation_refund_percentage,
        estimated_completion_days:      @product.estimated_completion_days_for_new_order
      }
    end

    private

    def serialize_variants
      @product.variants.map do |v|
        {
          id:                              v.id,
          size:                            v.size,
          color:                           v.color,
          gender:                          v.gender,
          cut:                             v.cut,
          sku:                             v.sku,
          stock_quantity:                  v.stock_quantity,
          reserved_quantity:               v.reserved_quantity,
          price_cents:                     v.price_cents,
          compare_at_price_cents:          v.compare_at_price_cents,
          additional_price_cents:          v.additional_price_cents,
          available_quantity:              v.available_quantity,
          effective_price_cents:           v.effective_price_cents,
          # Derived field: variant override OR product fallback. Frontend uses
          # this to show the "de" price; UI lets admin set the override.
          effective_compare_at_price_cents: v.effective_compare_at_price_cents,
          on_sale:                         v.on_sale?
        }
      end
    end
  end
end
