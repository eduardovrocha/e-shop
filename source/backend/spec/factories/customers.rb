FactoryBot.define do
  factory :customer do
    email { Faker::Internet.unique.email }
    name  { Faker::Name.name }
    phone { "11999999999" }

    trait :with_address do
      after(:create) do |customer|
        create(:customer_address, customer: customer, is_default: true)
      end
    end
  end

  factory :customer_address do
    association :customer
    zipcode      { "01310100" }
    street       { "Av. Paulista" }
    number       { "1000" }
    complement   { "" }
    neighborhood { "Bela Vista" }
    city         { "São Paulo" }
    state        { "SP" }
    country      { "BR" }
    is_default   { false }
  end
end
