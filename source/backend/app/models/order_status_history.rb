class OrderStatusHistory < ApplicationRecord
  belongs_to :order, inverse_of: :status_histories

  validates :status, :title, presence: true

  STATUS_METADATA = {
    "pending"          => { title: "Aguardando pagamento",   icon: "clock" },
    "paid"             => { title: "Pagamento aprovado",      icon: "check_circle" },
    "processing"       => { title: "Em processamento",        icon: "refresh" },
    "producing"        => { title: "Em produção",             icon: "tool" },
    "ready_to_ship"    => { title: "Pronto para envio",        icon: "package_check" },
    "packed"           => { title: "Embalado",                icon: "package" },
    "shipped"          => { title: "Enviado",                 icon: "truck" },
    "out_for_delivery" => { title: "Saiu para entrega",       icon: "map_pin" },
    "delivered"        => { title: "Entregue",                icon: "home" },
    "cancelled"        => { title: "Cancelado",               icon: "x_circle" },
    "refunded"         => { title: "Reembolsado",             icon: "rotate_ccw" },
    "failed"           => { title: "Pagamento falhou",        icon: "alert_circle" },
    "disputed"         => { title: "Em disputa",              icon: "alert_triangle" }
  }.freeze

  def self.title_for(status)
    STATUS_METADATA.dig(status.to_s, :title) || status.to_s.humanize
  end
end
