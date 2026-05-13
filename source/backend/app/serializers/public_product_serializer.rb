class PublicProductSerializer
  SIZE_ORDER = %w[PP P M G GG GGG XGG U].freeze

  def initialize(product, image_urls: [])
    @product    = product
    @image_urls = image_urls
  end

  def as_json(*)
    all_variants = @product.variants
    prices       = all_variants.map(&:price_cents)

    {
      id:              @product.id,
      name:            @product.name,
      description:     @product.description,
      price_cents:     @product.price_cents,
      min_price_cents: prices.min || @product.price_cents,
      max_price_cents: prices.max || @product.price_cents,
      slug:            @product.slug,
      images:          @image_urls,
      total_stock:     all_variants.sum(&:available_quantity),
      sizes:           sorted_sizes(all_variants),
      variant_stock:   sorted_variant_stock(all_variants)
    }
  end

  private

  def sorted_sizes(variants)
    variants.map(&:size).uniq.compact
            .sort_by { |s| SIZE_ORDER.index(s) || 99 }
  end

  def sorted_variant_stock(variants)
    variants.map do |v|
      qty = v.available_quantity
      {
        variant_id:            v.id,
        size:                  v.size,
        stock:                 qty,
        price_cents:           v.price_cents,
        effective_price_cents: v.price_cents,
        available:             qty > 0
      }
    end.sort_by { |v| SIZE_ORDER.index(v[:size]) || 99 }
  end
end
