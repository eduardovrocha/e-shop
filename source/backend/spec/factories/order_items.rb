FactoryBot.define do
  factory :order_item do
    association :order
    association :product_variant
    product           { product_variant&.product }
    name              { product_variant&.product&.name || "Item" }
    size              { product_variant&.size }
    quantity          { 1 }
    unit_price_cents  { 5000 }
    subtotal_cents    { 5000 }
    production_status { :pending }
  end
end
