# Layered validator for coupons used on the storefront:
#
#   Layer 1 — call without email: structural checks (exists, active, in
#             window, total usage not exhausted, scope matches at least one
#             cart item, sale-items rule respected) and computes the
#             discount_cents over the eligible subset.
#
#   Layer 2 — call with email: re-runs layer 1 PLUS per_customer_limit check.
#
# Race-safe consumption happens elsewhere (CouponApplier). This service is
# read-only and may be called from public endpoints.
#
# `cart_items` is an array of hashes:
#   { product: Product, unit_price_cents: Integer, quantity: Integer }
class CouponValidator
  Result = Struct.new(
    :valid, :coupon, :coupon_code, :eligible_items, :discount_cents, :error,
    keyword_init: true
  ) do
    def valid? = valid
  end

  def initialize(code:, cart_items:, email: nil)
    @code       = code.to_s.strip
    @cart_items = Array(cart_items)
    @email      = email&.to_s&.downcase&.strip.presence
  end

  def call
    return failure("Cupom inválido") if @code.empty?

    coupon, coupon_code = resolve_code
    return failure("Cupom inválido") unless coupon
    return failure("Cupom inativo")  unless coupon.active
    return failure("Cupom fora do período de validade") unless coupon.within_validity_window?
    return failure("Cupom esgotado") if coupon.usage_limit_reached?

    eligible = filter_eligible_items(coupon)
    return failure("Nenhum produto do carrinho é elegível para este cupom") if eligible.empty?

    if @email && coupon.per_customer_limit_reached_for?(@email)
      return failure("Você já utilizou este cupom o número máximo de vezes")
    end

    discount = calculate_discount(coupon, eligible)
    return failure("Desconto calculado é zero — verifique os preços do carrinho") if discount <= 0

    Result.new(
      valid:           true,
      coupon:          coupon,
      coupon_code:     coupon_code,
      eligible_items:  eligible,
      discount_cents:  discount,
      error:           nil
    )
  end

  private

  # Public codes match exactly against coupons.public_code (case-insensitive
  # via the normalized stored upcase). Otherwise we look up a CouponCode row.
  # Returns [coupon, coupon_code_or_nil].
  def resolve_code
    normalized = @code.upcase

    coupon = Coupon.find_by(code_type: "public", public_code: normalized)
    return [ coupon, nil ] if coupon

    coupon_code = CouponCode.includes(:coupon).find_by(code: normalized)
    return [ coupon_code&.coupon, coupon_code ] if coupon_code

    [ nil, nil ]
  end

  def filter_eligible_items(coupon)
    items = @cart_items

    if coupon.scope_type == "specific_products"
      allowed_ids = coupon.coupon_products.pluck(:product_id).to_set
      items = items.select { |it| allowed_ids.include?(product_id_of(it)) }
    end

    unless coupon.applies_to_sale_items
      items = items.reject { |it| on_sale?(it) }
    end

    items
  end

  def product_id_of(item)
    item[:product]&.id || item["product"]&.id
  end

  # A cart item counts as "on sale" if either the variant or the product
  # has a compare_at_price set. Variant takes precedence — that's the
  # source of truth used when rendering the price on the storefront.
  def on_sale?(item)
    variant = item[:variant] || item["variant"]
    if variant
      return variant.effective_compare_at_price_cents.present? &&
             variant.effective_compare_at_price_cents > variant.price_cents
    end
    product = item[:product] || item["product"]
    product&.compare_at_price_cents.present?
  end

  def calculate_discount(coupon, eligible)
    subtotal = eligible.sum { |it| unit_price_of(it) * quantity_of(it) }
    (subtotal * coupon.discount_percent / 100.0).round
  end

  def unit_price_of(item)
    (item[:unit_price_cents] || item["unit_price_cents"]).to_i
  end

  def quantity_of(item)
    qty = (item[:quantity] || item["quantity"]).to_i
    [ qty, 1 ].max
  end

  def failure(message)
    Result.new(valid: false, error: message)
  end
end
