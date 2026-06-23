FactoryBot.define do
  factory :order do
    stripe_intent_id   { "pi_#{Faker::Alphanumeric.unique.alphanumeric(number: 24)}" }
    customer_name      { Faker::Name.name }
    customer_email     { Faker::Internet.email }
    customer_phone     { "11999999999" }
    # CPF válido pelo algoritmo do TaxIdChecksum. Pedidos no fluxo real
    # exigem documento; os testes não precisam diferenciar entre clientes,
    # então um fixo é suficiente. Quando um spec específico precisar de
    # outro documento, sobrescreve no `build`/`create`.
    tax_id             { "11144477735" }
    delivery_method    { "pickup" }
    items_total_cents  { 5000 }
    shipping_fee_cents { 0 }
    total_cents        { 5000 }
    status             { "paid" }
    items              { [] }

    trait :manual_source do
      source                  { :manual }
      stripe_intent_id        { nil }
      external_payment_method { :pix }
      paid_at                 { Time.current }
    end

    trait :pending do
      status { "pending" }
    end

    trait :processing do
      status { "processing" }
    end

    trait :with_delivery do
      delivery_method    { "delivery" }
      shipping_fee_cents { 1500 }
      total_cents        { 6500 }
      shipping_address   { { "cep" => "01310-100", "address" => "Av. Paulista, 1000", "city" => "São Paulo", "state" => "SP" } }
    end
  end
end
