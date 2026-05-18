class OrderMailer < ApplicationMailer
  include Rails.application.routes.url_helpers

  SUBJECTS = {
    "paid"             => "✅ Pagamento confirmado",
    "processing"       => "📦 Pedido em processamento",
    "producing"        => "🎨 Pedido em produção",
    "packed"           => "📫 Pedido embalado",
    "shipped"          => "🚚 Pedido enviado",
    "out_for_delivery" => "🏠 Saiu para entrega",
    "delivered"        => "🎉 Pedido entregue",
    "cancelled"        => "❌ Pedido cancelado",
    "refunded"         => "💰 Reembolso processado"
  }.freeze

  def status_update(order, status)
    @order         = order
    @status        = status
    @is_paid       = status == "paid"
    @store_name    = StoreSetting.instance.event_name.presence || "Andrequicé"
    @support_email = Rails.application.credentials.dig(:mail, :support)
    @public_url    = order.public_tracking_url
    @history       = order.status_histories.order(:created_at)
    @subject_base  = SUBJECTS.fetch(status, "Atualização do pedido")
    @items_view    = build_items_view(order)
    @has_made_to_order = order.order_items.joins(product_variant: :product)
                                          .where(products: { fulfillment_mode: Product.fulfillment_modes[:made_to_order] })
                                          .exists?
    @show_promise = order.promised_completion_date.present? && @has_made_to_order
    @payment_ref  = order.stripe_intent_id.to_s.last(10).upcase.presence
    # shipping_address is a JSONB hash on the orders table — accept either
    # symbol/string keys for legacy safety.
    addr             = order.shipping_address.is_a?(Hash) ? order.shipping_address : {}
    @shipping_fields = {
      cep:        addr["cep"]        || addr[:cep],
      address:    addr["address"]    || addr[:address],
      number:     addr["number"]     || addr[:number],
      complement: addr["complement"] || addr[:complement],
      city:       addr["city"]       || addr[:city],
      state:      addr["state"]      || addr[:state]
    }
    @is_pickup = order.delivery_method == "pickup"

    mail(
      to:      order.customer_email,
      from:    "#{@store_name} <#{@support_email}>",
      subject: "#{@subject_base} — #{order.number}"
    )
  end

  private

  # Builds the per-item view-model used by the email template. Tries the
  # canonical source (order_items table with eager-loaded product images)
  # first and falls back to the legacy orders.items JSONB so pre-Phase-1
  # orders still render. Each entry contains everything the template needs
  # so the ERB stays a dumb iterator.
  def build_items_view(order)
    rows = order.order_items
                .includes(product_variant: { product: { images_attachments: :blob } })
                .to_a

    if rows.any?
      rows.map { |item| order_item_row(item) }
    else
      Array(order.items).map { |item| jsonb_item_row(item) }
    end
  end

  def order_item_row(item)
    product = item.product_variant&.product
    {
      name:             item.name.presence || product&.name || "Item",
      size:             item.size,
      quantity:         item.quantity.to_i,
      unit_price_cents: item.unit_price_cents.to_i,
      subtotal_cents:   item.subtotal_cents.to_i,
      image_url:        product_image_url(product),
      fulfillment_mode: product&.fulfillment_mode || "from_stock"
    }
  end

  def jsonb_item_row(item)
    qty = item["quantity"].to_i
    {
      name:             item["name"],
      size:             item["size"],
      quantity:         qty,
      unit_price_cents: item["unit_price_cents"].to_i,
      subtotal_cents:   item["subtotal_cents"].to_i,
      image_url:        nil, # legacy snapshot — no FK back to product
      fulfillment_mode: item["fulfillment_mode"] || "from_stock"
    }
  end

  def product_image_url(product)
    return nil unless product
    blob = product.ordered_images.first
    return nil unless blob
    rails_blob_url(blob, host: image_host, protocol: image_protocol)
  rescue StandardError
    # Never block an order email because of an image URL hiccup.
    nil
  end

  def image_host
    host = ENV.fetch("HOST_URL", "https://api.andrequice.store")
    host.sub(%r{\Ahttps?://}, "").split(":").first
  end

  def image_protocol
    ENV.fetch("HOST_URL", "").start_with?("http://") ? "http" : "https"
  end
end
