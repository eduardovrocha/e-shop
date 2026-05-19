module Api
  module V1
    class PaymentsController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      # POST /api/v1/payments/create_intent
      def create_intent
        items = params.require(:items)
        delivery_method = params.fetch(:delivery_method, "pickup")

        unless Order::DELIVERY_METHODS.include?(delivery_method)
          return render json: { error: "Método de entrega inválido" }, status: :unprocessable_entity
        end

        # Stock validation only applies to from_stock items; made_to_order
        # items are produced on demand and have no stock to check.
        validate_stock!(items)

        items_total = calculate_items_total_cents(items)

        if items_total <= 0
          return render json: { error: "Carrinho inválido" }, status: :unprocessable_entity
        end

        shipping_fee, shipping_error = resolve_shipping_fee(items, delivery_method)
        if shipping_error
          return render json: { error: shipping_error }, status: :unprocessable_entity
        end
        total = items_total + shipping_fee

        # Atomic check-and-reserve with row-level locking — from_stock only.
        reserve_stock!(items)

        # Production lead-time snapshot. Per-item promised_completion_days is
        # captured here so the webhook can stamp each OrderItem with the date
        # we committed to at purchase time, regardless of queue movement
        # between create_intent and payment_intent.succeeded.
        promised_completion_snapshot = build_promised_completion_snapshot(items)
        aggregated_completion_days   =
          promised_completion_snapshot.map { |s| s[:promised_completion_days] }.max.to_i
        aggregated_promised_completion_date =
          aggregated_completion_days.days.from_now.to_date

        payment_intent = Stripe::PaymentIntent.create(
          amount: total,
          currency: "brl",
          automatic_payment_methods: { enabled: true },
          payment_method_options: {
            card: {
              installments: { enabled: true }
            }
          },
          metadata: {
            source:             "andrequice-web",
            delivery_method:    delivery_method,
            items_total_cents:  items_total,
            shipping_fee_cents: shipping_fee,
            items_snapshot:     items.to_json,
            customer_name:      params[:customer_name],
            customer_email:     params[:customer_email],
            customer_phone:     params[:customer_phone],
            shipping_address:    params[:shipping_address]&.to_json,
            shipping_service_id: params[:shipping_service_id],
            shipping_cep:        params[:shipping_cep],
            promised_completion_snapshot:        promised_completion_snapshot.to_json,
            aggregated_promised_completion_date: aggregated_promised_completion_date.iso8601
          }
        )

        render json: {
          client_secret:                       payment_intent.client_secret,
          total_cents:                         total,
          items_total_cents:                   items_total,
          shipping_fee_cents:                  shipping_fee,
          aggregated_promised_completion_date: aggregated_promised_completion_date
        }
      rescue ProductVariant::InsufficientStockError => e
        render json: { error: e.message }, status: :unprocessable_entity
      rescue Stripe::StripeError => e
        Rails.logger.error "Stripe error on create_intent: #{e.message}"
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # POST /api/v1/payments/webhook
      def webhook
        payload    = request.env["RAW_POST_DATA"] || request.body.read
        sig_header = request.headers["HTTP_STRIPE_SIGNATURE"] || request.headers["Stripe-Signature"]

        event = Stripe::Webhook.construct_event(
          payload, sig_header, ENV.fetch("STRIPE_WEBHOOK_SECRET")
        )

        if ProcessedWebhookEvent.already_processed?(event.id)
          Rails.logger.info "[Stripe] Duplicate event ignored: #{event.id}"
          return render json: { received: true }
        end

        handle_event(event)
        ProcessedWebhookEvent.mark_processed!(event.id, event.type)

        render json: { received: true }
      rescue JSON::ParserError
        Rails.logger.warn "[Stripe] Invalid webhook payload"
        head :ok
      rescue Stripe::SignatureVerificationError => e
        Rails.logger.error "[Stripe][SECURITY] Webhook signature failed: #{e.message}"
        head :bad_request
      rescue Stripe::StripeError => e
        Rails.logger.error "Webhook Stripe error: #{e.message}"
        render json: { error: e.message }, status: :unprocessable_entity
      end

      private

      # Validate available stock for every item before creating payment intent.
      # made_to_order items are produced on demand and skip stock validation.
      # Raises ProductVariant::InsufficientStockError on first failure.
      def validate_stock!(items)
        items.each do |item|
          variant_id = item[:variant_id].to_i
          qty        = [ item[:quantity].to_i, 1 ].max

          variant = ProductVariant.includes(:product).find_by(id: variant_id)
          unless variant
            raise ProductVariant::InsufficientStockError.new(
              OpenStruct.new(product: OpenStruct.new(name: "Produto"), size: "variante #{variant_id}", available_quantity: 0),
              qty
            )
          end

          next if variant.product&.made_to_order?

          raise ProductVariant::InsufficientStockError.new(variant, qty) if variant.available_quantity < qty
        end
      end

      # Builds per-item promised completion days, querying the product for the
      # estimated lead time accounting for the current queue. from_stock items
      # always report 0 days. Returns an array of hashes (one per item).
      def build_promised_completion_snapshot(items)
        items.filter_map do |item|
          variant = ProductVariant.includes(:product).find_by(id: item[:variant_id].to_i)
          next unless variant&.product

          days =
            if variant.product.made_to_order?
              variant.product.estimated_completion_days_for_new_order.to_i
            else
              0
            end

          {
            variant_id:               variant.id,
            quantity:                 [ item[:quantity].to_i, 1 ].max,
            promised_completion_days: days
          }
        end
      end

      # Resolves total using effective_price_cents per variant.
      # effective_price_cents = variant.price_cents || product.price_cents
      # Frontend prices are never trusted — all values come from DB.
      def calculate_items_total_cents(items)
        variant_ids = items.map { |i| i[:variant_id].to_i }.uniq
        variants    = ProductVariant.includes(:product).where(id: variant_ids).index_by(&:id)

        items.sum do |item|
          variant  = variants[item[:variant_id].to_i]
          next 0 unless variant

          quantity = [ item[:quantity].to_i, 1 ].max
          variant.effective_price_cents * quantity
        end
      end

      # Recalculates the shipping fee server-side using CalculatorService.
      # Returns [fee_cents, nil] on success or [nil, error_message] on failure.
      # Never trusts the frontend-provided price — finds the option by service_id
      # from a fresh calculation so the amount cannot be tampered.
      def resolve_shipping_fee(items, delivery_method)
        return [ 0, nil ] if delivery_method == "pickup"

        cep        = params[:shipping_cep].to_s.strip
        service_id = params[:shipping_service_id].to_i

        return [ nil, "CEP é obrigatório para entrega com frete" ] if cep.blank?

        # Map variant_id → product_id (CalculatorService expects product granularity)
        variant_ids    = items.map { |i| i[:variant_id].to_i }.uniq
        variants_by_id = ProductVariant.where(id: variant_ids).index_by(&:id)

        shipping_items = items.filter_map do |item|
          variant = variants_by_id[item[:variant_id].to_i]
          next unless variant
          { product_id: variant.product_id, quantity: [ item[:quantity].to_i, 1 ].max }
        end

        options = Shipping::CalculatorService.new.calculate(
          to_zipcode: cep,
          items:      shipping_items
        )

        option = options.find { |o| o[:service_id] == service_id }
        return [ nil, "Opção de frete indisponível. Recalcule o frete e tente novamente." ] unless option

        [ option[:price_cents].to_i, nil ]
      rescue => e
        Rails.logger.error "[Shipping] resolve_shipping_fee falhou: #{e.message}"
        [ nil, "Erro ao calcular frete. Tente novamente." ]
      end

      # Atomically reserves stock for every item using SELECT FOR UPDATE.
      # Runs inside a single transaction so a partial failure rolls back all
      # increments — the buyer gets a 422 instead of a partially-reserved cart.
      # Raises ProductVariant::InsufficientStockError on the first item that
      # fails availability, which is rescued in create_intent → 422 response.
      def reserve_stock!(items)
        ActiveRecord::Base.transaction do
          items.each do |item|
            variant_id = item[:variant_id].to_i
            qty        = [ item[:quantity].to_i, 1 ].max

            variant = ProductVariant.lock.find_by(id: variant_id)

            unless variant
              raise ProductVariant::InsufficientStockError.new(
                OpenStruct.new(
                  product:            OpenStruct.new(name: "Produto"),
                  size:               "variante #{variant_id}",
                  available_quantity: 0
                ),
                qty
              )
            end

            # made_to_order items don't reserve stock — they are produced
            # to order and don't share the from_stock pool.
            next if variant.product&.made_to_order?

            raise ProductVariant::InsufficientStockError.new(variant, qty) if variant.available_quantity < qty

            variant.increment!(:reserved_quantity, qty)
          end
        end
      end

      # Releases stock reservations that were created in create_intent.
      # Called from handle_payment_failed for both payment_intent.payment_failed
      # and payment_intent.canceled events. Reads items from PaymentIntent
      # metadata because the Order record may not exist yet at failure time
      # (orders are only created in handle_payment_succeeded).
      def release_stock_reservation!(intent)
        raw_items = begin
          JSON.parse(intent.metadata["items_snapshot"] || "[]")
        rescue JSON::ParserError
          []
        end

        raw_items.each do |item|
          variant = ProductVariant.find_by(id: item["variant_id"])
          next unless variant
          # made_to_order items never reserved stock — nothing to release.
          next if variant.product&.made_to_order?

          qty = [ item["quantity"].to_i, 1 ].max
          variant.decrement!(:reserved_quantity, [ variant.reserved_quantity, qty ].min)
          Rails.logger.info "[Stock] Reservation released: #{qty}× variant #{variant.id} (#{variant.sku}) — reserved=#{variant.reserved_quantity}"
        end
      rescue => e
        Rails.logger.error "[Stock] Failed to release reservation for intent #{intent.id}: #{e.message}"
      end

      def handle_event(event)
        case event.type
        when "payment_intent.succeeded"
          handle_payment_succeeded(event.data.object)
        when "payment_intent.payment_failed", "payment_intent.canceled"
          handle_payment_failed(event.data.object)
        when "charge.dispute.created"
          handle_dispute_created(event.data.object)
        else
          Rails.logger.debug "[Stripe] Unhandled event: #{event.type}"
        end
      end

      def handle_payment_succeeded(intent)
        metadata = intent.metadata

        raw_items = begin
          JSON.parse(metadata["items_snapshot"] || "[]")
        rescue JSON::ParserError
          []
        end

        # Enrich snapshot with server-authoritative prices — freezes unit costs at purchase time
        items_snapshot = enrich_items_snapshot(raw_items)

        shipping_address = begin
          JSON.parse(metadata["shipping_address"] || "null")
        rescue JSON::ParserError
          nil
        end

        promised_snapshot = parse_promised_completion_snapshot(metadata)
        aggregated_promised_date =
          begin
            Date.parse(metadata["aggregated_promised_completion_date"].to_s)
          rescue ArgumentError, TypeError
            nil
          end

        payment_details = extract_payment_details(intent)

        newly_created = false
        order = Order.find_or_create_by!(stripe_intent_id: intent.id) do |o|
          o.customer_name            = metadata["customer_name"]
          o.customer_email           = metadata["customer_email"]
          o.customer_phone           = metadata["customer_phone"]
          o.delivery_method          = metadata["delivery_method"] || "pickup"
          o.items_total_cents        = metadata["items_total_cents"].to_i
          o.shipping_fee_cents       = metadata["shipping_fee_cents"].to_i
          o.total_cents              = intent.amount
          o.items                    = items_snapshot
          o.shipping_address         = shipping_address
          o.promised_completion_date = aggregated_promised_date
          o.installment_count        = payment_details[:installment_count]
          o.payment_brand            = payment_details[:brand]
          o.payment_last4            = payment_details[:last4]
          o.status                   = "paid"
          newly_created              = true
        end

        # Backfill payment fields on duplicate webhooks when columns are
        # still nil (e.g. order created before these fields existed, or
        # first webhook arrived before the charge was fully populated).
        backfill_payment_fields!(order, payment_details) unless newly_created

        # For duplicate webhook events the order already exists — just ensure paid
        unless newly_created
          OrderStatusService.transition(order, "paid", admin: "stripe") unless order.paid?
        else
          # Record initial history and queue notification email
          OrderStatusService.record(order, admin: "stripe")
        end

        deduct_stock!(items_snapshot)

        # Materialize OrderItem rows the first time this intent is processed
        # and drive each item through mark_paid! so the per-item state machine
        # fires its callbacks (queue advance for made_to_order, immediate
        # skip-to-ready_to_ship for from_stock). Guarded by an
        # already-created check to stay idempotent across webhook retries.
        if newly_created || order.order_items.empty?
          create_order_items_for!(order, items_snapshot, promised_snapshot)
          order.order_items.reload.each(&:mark_paid!)
          # Stamp the order with the max promised date across items (if any
          # made_to_order items pushed it out further than the aggregate).
          max_promised = order.order_items.maximum(:promised_completion_date)
          order.update!(promised_completion_date: max_promised) if max_promised
        end

        CustomerUpsertService.call(order)
        OrderBroadcastService.call(order) if newly_created

        # First paid order ever? Promote completed onboarding users to
        # phase_2_ready so the operational tour fires on their next login.
        # Guarded by `newly_created` (skip on webhook retries) and the
        # paid-order count (skip on all subsequent sales).
        if newly_created && Order.where(status: %w[paid shipped delivered]).count == 1
          fire_onboarding_first_sale
        end

        Rails.logger.info "[Stripe] Order #{order.number || order.id} paid — intent=#{intent.id} total=#{intent.amount}"
      end

      def fire_onboarding_first_sale
        store = StoreSetting.instance
        affected = OnboardingProgress.fire_first_sale!(store_setting: store)
        return if affected.zero?

        TelemetryService.track(
          event:            "tour_first_sale_after_completion",
          user_id:          nil,
          store_setting_id: store.id,
          properties:       { affected: affected, source: "stripe_webhook" }
        )
      rescue StandardError => e
        # Onboarding side-effect must never break the payment flow.
        Rails.logger.warn "[Onboarding] first-sale promotion failed: #{e.class}: #{e.message}"
      end

      def parse_promised_completion_snapshot(metadata)
        JSON.parse(metadata["promised_completion_snapshot"] || "[]")
      rescue JSON::ParserError
        []
      end

      # Retrieves the latest charge from Stripe and extracts the payment
      # method details we display on receipts: installment plan count (nil
      # when à-vista), card brand, and last4. All failures are swallowed
      # and logged — billing-display data is not load-bearing for order
      # creation, and a Stripe outage must not block the webhook.
      def extract_payment_details(intent)
        empty = { installment_count: nil, brand: nil, last4: nil }
        charge_id = intent.respond_to?(:latest_charge) ? intent.latest_charge : nil
        return empty if charge_id.blank?

        charge = Stripe::Charge.retrieve(charge_id)
        card   = charge.payment_method_details&.card
        {
          installment_count: card&.installments&.plan&.count,
          brand:             card&.brand,
          last4:             card&.last4
        }
      rescue Stripe::StripeError => e
        Rails.logger.warn "[Stripe] Failed to read payment details for intent #{intent.id}: #{e.message}"
        empty
      end

      # Updates only the columns that arrived blank on a duplicate webhook.
      # Never overwrites existing values — once persisted, the first reading
      # of the charge is the canonical one.
      def backfill_payment_fields!(order, details)
        updates = {}
        updates[:installment_count] = details[:installment_count] if order.installment_count.nil? && details[:installment_count]
        updates[:payment_brand]     = details[:brand]             if order.payment_brand.blank?  && details[:brand].present?
        updates[:payment_last4]     = details[:last4]             if order.payment_last4.blank?  && details[:last4].present?
        order.update!(updates) if updates.any?
      end

      # Creates one OrderItem row per item in the snapshot and stamps the
      # per-item promised_completion_date from the create_intent snapshot.
      # Items whose variant has been deleted are skipped — the order's items
      # JSONB still carries the historical record for those.
      def create_order_items_for!(order, items_snapshot, promised_snapshot)
        promised_by_variant = promised_snapshot.each_with_object({}) do |entry, h|
          h[entry["variant_id"].to_i] = entry["promised_completion_days"].to_i
        end

        items_snapshot.each do |item|
          variant_id = item["variant_id"].to_i
          variant    = ProductVariant.find_by(id: variant_id)
          next unless variant

          days = promised_by_variant[variant_id] || 0
          OrderItem.create!(
            order:                    order,
            product_variant:          variant,
            product:                  variant.product,
            name:                     item["name"],
            size:                     item["size"],
            quantity:                 item["quantity"].to_i,
            unit_price_cents:         item["unit_price_cents"].to_i,
            subtotal_cents:           item["subtotal_cents"].to_i,
            production_status:        :pending,
            promised_completion_date: days.days.from_now.to_date
          )
        end
      end

      # Enriches the raw frontend snapshot with server-authoritative prices.
      # Freezes unit_price_cents and subtotal_cents at the moment of purchase —
      # these values never change even if variant prices are updated later.
      def enrich_items_snapshot(raw_items)
        variant_ids = raw_items.map { |i| (i["variant_id"] || i[:variant_id]).to_i }.uniq
        variants    = ProductVariant.includes(:product).where(id: variant_ids).index_by(&:id)

        raw_items.map do |item|
          variant_id      = (item["variant_id"] || item[:variant_id]).to_i
          variant         = variants[variant_id]
          qty             = [ (item["quantity"] || item[:quantity]).to_i, 1 ].max
          unit_price_cents = variant&.price_cents || 0

          {
            "id"               => item["id"] || item[:id],
            "variant_id"       => variant_id,
            "name"             => item["name"] || item[:name] || variant&.product&.name,
            "size"             => item["size"] || item[:size] || variant&.size,
            "quantity"         => qty,
            "unit_price_cents" => unit_price_cents,
            "subtotal_cents"   => unit_price_cents * qty
          }
        end
      end

      # Atomically decrements stock_quantity and clears the matching reservation
      # for each variant in the enriched items snapshot.
      def deduct_stock!(items_snapshot)
        items_snapshot.each do |item|
          variant_id = item["variant_id"].to_i
          qty        = [ item["quantity"].to_i, 1 ].max
          next if variant_id.zero?

          begin
            variant = ProductVariant.find_by(id: variant_id)
            unless variant
              Rails.logger.error "[Stock] Variant #{variant_id} not found — skipping deduction"
              next
            end

            # made_to_order items don't decrement physical stock at payment.
            if variant.product&.made_to_order?
              Rails.logger.info "[Stock] Skipping deduction for made_to_order variant #{variant.id} (#{variant.sku})"
              next
            end

            variant.decrement_stock!(qty)

            # Release the reservation that was created at create_intent time.
            # Uses [reserved, qty].min to stay non-negative in the edge case
            # where payment_failed already ran and cleared the reservation first.
            variant.decrement!(:reserved_quantity, [ variant.reserved_quantity, qty ].min)

            Rails.logger.info "[Stock] Deducted #{qty}× variant #{variant.id} (#{variant.sku}) — stock=#{variant.reload.stock_quantity} reserved=#{variant.reserved_quantity}"
          rescue ProductVariant::InsufficientStockError => e
            Rails.logger.error "[Stock] #{e.message}"
          rescue => e
            Rails.logger.error "[Stock] Unexpected error for variant #{variant_id}: #{e.message}"
          end
        end
      end

      def handle_payment_failed(intent)
        order = Order.find_by(stripe_intent_id: intent.id)
        order&.update!(status: "failed")
        Rails.logger.error "[Stripe] Payment failed/canceled: #{intent.id} — #{intent.last_payment_error&.message}"
        release_stock_reservation!(intent)
      end

      def handle_dispute_created(dispute)
        Rails.logger.warn "[Stripe] Dispute created: #{dispute.id} reason=#{dispute.reason} intent=#{dispute.payment_intent}"

        order = Order.find_by(stripe_intent_id: dispute.payment_intent)
        unless order
          Rails.logger.warn "[Stripe] Dispute #{dispute.id} sem pedido correspondente (intent=#{dispute.payment_intent})"
          return
        end

        result = OrderStatusService.transition(
          order, "disputed",
          admin:       "stripe-webhook",
          description: "Disputa aberta via Stripe: #{dispute.reason}",
          metadata:    { dispute_id: dispute.id, dispute_reason: dispute.reason }
        )

        unless result[:ok]
          Rails.logger.error "[Stripe] Não foi possível transicionar pedido #{order.id} para disputed: #{result[:error]}"
        end

        DisputeNotificationJob.perform_later(order_id: order.id, dispute_id: dispute.id)
      end
    end
  end
end
