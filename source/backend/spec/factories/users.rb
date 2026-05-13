FactoryBot.define do
  factory :user do
    name     { Faker::Name.name }
    email    { Faker::Internet.unique.email }
    password { "Password123!" }
    role     { "admin" }

    trait :super_admin do
      role { "super_admin" }
    end
  end
end
