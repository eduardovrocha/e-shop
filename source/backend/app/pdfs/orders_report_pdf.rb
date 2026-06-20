require "prawn"
require "prawn/table"

# Renderiza um PDF com a lista de pedidos de um status (ou agrupados por
# status quando status é nil — ver modo agrupado). Inclui detalhes
# operacionais + lucro/margem. Admin-only.
class OrdersReportPdf
  def initialize(orders:, status: nil)
    @orders = Array(orders)
    @status = status.presence
  end

  def render
    # A fonte AFM padrão do Prawn só suporta Windows-1252; sanitizamos toda
    # string na fronteira (#t), então o aviso m17n é ruído conhecido.
    Prawn::Fonts::AFM.hide_m17n_warning = true
    @pdf = Prawn::Document.new(page_size: "A4", margin: 36)
    header
    @orders.each { |order| order_block(order) }
    report_totals(@orders)
    @pdf.render
  end

  private

  def header
    label = @status ? OrderStatusHistory.title_for(@status) : "Todos os status"
    write "Relatório de pedidos — #{label}", size: 16, style: :bold
    write "Gerado em #{Time.current.strftime('%d/%m/%Y %H:%M')}", size: 9
    write "#{@orders.size} pedido(s)", size: 9
    @pdf.move_down 12
  end

  def order_block(order)
    write "Pedido #{order.number} — #{OrderStatusHistory.title_for(order.status)}", size: 12, style: :bold
    contact = [ order.customer_email, order.customer_phone ].compact.reject(&:blank?).join(" / ")
    write "#{order.created_at.strftime('%d/%m/%Y %H:%M')} · #{order.customer_name} · #{contact}", size: 9
    @pdf.move_down 4

    rows = [ %w[Produto Qtd Preço Subtotal].map { |h| t(h) } ]
    order.order_items.each do |item|
      rows << [
        t([ item.name, item.variant_descriptors ].reject(&:blank?).join(" — ")),
        item.quantity.to_s,
        t(money(item.unit_price_cents)),
        t(money(item.subtotal_cents))
      ]
    end
    @pdf.table(rows, header: true, width: @pdf.bounds.width, cell_style: { size: 8, padding: 4 })

    @pdf.move_down 4
    discount = [ order.items_total_cents + order.shipping_fee_cents - order.total_cents, 0 ].max
    write "Subtotal #{money(order.items_total_cents)} · Frete #{money(order.shipping_fee_cents)} · Desconto #{money(discount)} · Total #{money(order.total_cents)}", size: 9

    prof = profit_for(order)
    if prof[:revenue].positive?
      write "Custo #{money(prof[:cost])} · Lucro #{money(prof[:profit])} · Margem #{margin(prof)}", size: 9, style: :bold
    end
    write "Obs.: #{order.notes}", size: 8 if order.notes.present?
    @pdf.move_down 12
  end

  def report_totals(orders)
    agg = orders.each_with_object({ revenue: 0, cost: 0, profit: 0 }) do |o, acc|
      p = profit_for(o)
      acc[:revenue] += p[:revenue]
      acc[:cost]    += p[:cost]
      acc[:profit]  += p[:profit]
    end
    @pdf.move_down 6
    write "Totais do relatório", size: 11, style: :bold
    write "Receita (com custo) #{money(agg[:revenue])} · Custo #{money(agg[:cost])} · Lucro #{money(agg[:profit])} · Margem #{margin(agg)}", size: 9
  end

  # Escreve texto sanitizado (Windows-1252) — ver nota em #render.
  def write(content, **opts)
    @pdf.text t(content), **opts
  end

  # Reduz a string ao que a fonte AFM suporta (Windows-1252), substituindo
  # caracteres incompatíveis por "?" para nunca derrubar a geração do PDF.
  def t(content)
    content.to_s.encode("Windows-1252", invalid: :replace, undef: :replace, replace: "?")
  end

  # Agregação de lucro mirando o OrderDetailSerializer: itens sem custo
  # (unit_cost_cents nil) são excluídos do cálculo.
  def profit_for(order)
    with_cost = order.order_items.reject { |i| i.unit_cost_cents.nil? }
    revenue   = with_cost.sum(&:subtotal_cents)
    cost      = with_cost.sum(&:cost_subtotal_cents)
    { revenue: revenue, cost: cost, profit: revenue - cost }
  end

  def margin(prof)
    return "—" unless prof[:revenue].positive?
    pct = (prof[:profit].to_f / prof[:revenue] * 100).round(1)
    "#{('%.1f' % pct).tr('.', ',')}%"
  end

  def money(cents)
    "R$ #{('%.2f' % (cents.to_i / 100.0)).tr('.', ',')}"
  end
end
