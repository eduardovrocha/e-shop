FactoryBot.define do
  factory :coupon do
    sequence(:name) { |n| "Cupom #{n}" }
    discount_percent { 10 }
    applies_to_sale_items { false }
    code_type  { "public" }
    sequence(:public_code) { |n| "PROMO#{n}" }
    scope_type { "all_products" }
    active     { true }

    trait :unique do
      code_type   { "unique" }
      public_code { nil }
    end

    trait :sale_items do
      applies_to_sale_items { true }
    end

    trait :specific_products do
      scope_type { "specific_products" }
    end
  end

  factory :coupon_code do
    coupon
    sequence(:code) { |n| "UNIQ#{n.to_s.rjust(6, '0')}" }
  end
end
