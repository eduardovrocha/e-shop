FactoryBot.define do
  factory :product do
    name        { Faker::Commerce.product_name }
    description { Faker::Lorem.paragraph }
    price_cents { 5000 }
    category    { "camisetas" }
    active      { true }

    trait :with_variant do
      after(:create) do |product|
        create(:product_variant, product: product)
      end
    end

    trait :with_dimensions do
      weight_g  { 300 }
      height_mm { 40 }
      width_mm  { 200 }
      length_mm { 300 }
    end

    trait :made_to_order do
      fulfillment_mode               { :made_to_order }
      production_lead_time_days      { 14 }
      production_capacity            { 3 }
      cancellation_refund_percentage { 50 }
    end
  end

  factory :product_variant do
    association :product
    size           { "M" }
    sku            { Faker::Alphanumeric.unique.alphanumeric(number: 10).upcase }
    stock_quantity { 10 }
    price_cents    { 5000 }
  end
end
