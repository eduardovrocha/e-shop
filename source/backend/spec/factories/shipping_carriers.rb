FactoryBot.define do
  factory :shipping_carrier do
    sequence(:me_service_id) { |n| n }
    name             { "PAC" }
    company          { "Correios" }
    enabled          { true }
    extra_days       { 0 }
    extra_margin_pct { 0 }
    min_value_cents  { 0 }

    trait :disabled do
      enabled { false }
    end

    trait :with_margin do
      extra_margin_pct { 10 }
      extra_days       { 2 }
    end
  end
end
