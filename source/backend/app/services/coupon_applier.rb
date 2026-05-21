# Reserves a coupon slot at PaymentIntent creation time and converts the
# reservation into a finalized usage when the success webhook arrives.
# The two operations live here so the locking + validation logic stays in
# one place.
#
# Lifecycle:
#
#   create_intent ──▶ CouponApplier.reserve!   creates a CouponUsage with
#                                              stripe_intent_id (no order yet)
#
#   webhook succeeded ─▶ CouponApplier.finalize! attaches order_id to the
#                                                reservation and snapshots
#                                                discount columns on the order
#
#   webhook failed / canceled ─▶ CouponApplier.release! deletes the
#                                                       reservation
#
# Concurrency: SELECT FOR UPDATE on coupons row. Two concurrent reserve!
# calls for the last available slot serialize naturally; the loser raises
# CouponNoLongerValid before the PaymentIntent is created.
class CouponApplier
  class CouponNoLongerValid < StandardError; end

  Reservation = Struct.new(:usage, :discount_cents, :coupon, keyword_init: true)

  # Reserves a slot. Returns Reservation; raises CouponNoLongerValid on
  # any validation failure. Caller must be inside a DB transaction so the
  # PaymentIntent.create that follows can roll back the reservation if the
  # Stripe API call fails.
  def self.reserve!(code:, cart_items:, email:, stripe_intent_id: nil)
    raise CouponNoLongerValid, "Código do cupom é obrigatório" if code.to_s.strip.empty?
    raise CouponNoLongerValid, "Email do cliente é obrigatório" if email.to_s.strip.empty?

    normalized_email = email.to_s.downcase.strip

    Coupon.transaction do
      validation = CouponValidator.new(
        code:       code,
        cart_items: cart_items,
        email:      normalized_email
      ).call

      raise CouponNoLongerValid, validation.error unless validation.valid?

      # Re-fetch under lock so two concurrent reservations for the same
      # coupon serialize on the usage_limit_reached? check below.
      coupon = Coupon.lock.find(validation.coupon.id)
      raise CouponNoLongerValid, "Cupom esgotado" if coupon.usage_limit_reached?

      if coupon.per_customer_limit_reached_for?(normalized_email)
        raise CouponNoLongerValid, "Você já utilizou este cupom o número máximo de vezes"
      end

      # The DB-level constraint demands order_id OR stripe_intent_id be
      # present. At reserve time we don't have either yet (Stripe hasn't
      # been called), so we stamp a provisional id; attach_intent! replaces
      # it once Stripe accepts the intent. The placeholder is unique per
      # reservation so concurrent reserves can't collide on the unique
      # index — release! and finalize! both look up by stripe_intent_id, so
      # any value works as long as it matches the later attach_intent! call.
      provisional_id = stripe_intent_id || "pending:#{SecureRandom.hex(12)}"

      usage = CouponUsage.create!(
        coupon:                coupon,
        coupon_code:           validation.coupon_code,
        email:                 normalized_email,
        stripe_intent_id:      provisional_id,
        discount_amount_cents: validation.discount_cents
      )

      Reservation.new(
        usage:          usage,
        discount_cents: validation.discount_cents,
        coupon:         coupon
      )
    end
  end

  # Stamps the stripe_intent_id onto an already-reserved usage. Used right
  # after Stripe::PaymentIntent.create returns successfully, so the row is
  # discoverable from the webhook (which only knows the intent id).
  def self.attach_intent!(usage, stripe_intent_id)
    usage.update!(stripe_intent_id: stripe_intent_id)
  end

  # Finalizes a reservation: webhook handler calls this with the Order it
  # just created. The discount_* snapshot is written onto the Order in the
  # same transaction.
  def self.finalize!(stripe_intent_id:, order:)
    usage = CouponUsage.find_by(stripe_intent_id: stripe_intent_id)
    return nil unless usage

    CouponUsage.transaction do
      usage.update!(order: order)
      coupon = usage.coupon
      order.update!(
        coupon:                   coupon,
        coupon_code_used:         resolve_redeemed_code(usage),
        discount_percent_applied: coupon.discount_percent,
        discount_amount_cents:    usage.discount_amount_cents
      )
      usage
    end
  end

  # Releases a reservation. Idempotent — safe to call from retried webhooks.
  def self.release!(stripe_intent_id:)
    CouponUsage.where(stripe_intent_id: stripe_intent_id, order_id: nil).delete_all
  end

  def self.resolve_redeemed_code(usage)
    usage.coupon_code&.code || usage.coupon.public_code
  end
end
