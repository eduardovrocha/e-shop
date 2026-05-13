require "rails_helper"

RSpec.describe Shipping::CalculatorService, type: :service do
  let(:api_url) { "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate" }

  let(:setting) do
    ShippingSetting.instance.tap do |s|
      s.update!(
        me_access_token:          "test-token",
        origin_zipcode:           "01310100",
        me_sandbox:               true,
        global_extra_days:        0,
        global_extra_margin_pct:  0,
        local_pickup_enabled:     false,
        free_shipping_enabled:    false,
        free_shipping_above_cents: 0
      )
    end
  end

  let!(:carrier) { create(:shipping_carrier, me_service_id: 1, name: "PAC", company: "Correios") }
  let!(:product) { create(:product, :with_dimensions, price_cents: 8900) }
  let(:items)    { [{ product_id: product.id, quantity: 1 }] }

  let(:success_body) do
    [
      {
        "id"            => 1,
        "name"          => "PAC",
        "company"       => { "name" => "Correios" },
        "price"         => "15.50",
        "delivery_time" => 5,
        "error"         => nil
      }
    ].to_json
  end

  before { setting }

  describe "#calculate" do
    context "com API disponível" do
      before do
        stub_request(:post, api_url)
          .to_return(status: 200, body: success_body, headers: { "Content-Type" => "application/json" })
      end

      it "retorna opção de frete com preço e prazo corretos" do
        results = described_class.new.calculate(to_zipcode: "04568000", items: items)

        pac = results.find { |r| r[:service_id] == 1 }
        expect(pac).not_to be_nil
        expect(pac[:price_cents]).to eq(1550)
        expect(pac[:delivery_days]).to eq(5)
        expect(pac[:carrier]).to eq("Correios")
        expect(pac[:service]).to eq("PAC")
      end

      it "aplica margem percentual do carrier sobre o preço base" do
        carrier.update!(extra_margin_pct: 10)

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        pac = results.find { |r| r[:service_id] == 1 }

        expect(pac[:price_cents]).to eq((1550 * 1.10).round)
      end

      it "aplica extra_days do carrier" do
        carrier.update!(extra_days: 2)

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        pac = results.find { |r| r[:service_id] == 1 }

        expect(pac[:delivery_days]).to eq(7)
      end

      it "respeita min_value_cents do carrier" do
        carrier.update!(min_value_cents: 3000)

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        pac = results.find { |r| r[:service_id] == 1 }

        expect(pac[:price_cents]).to eq(3000)
      end

      it "exclui serviço cujo carrier está desabilitado" do
        carrier.update!(enabled: false)

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)

        expect(results.none? { |r| r[:service_id] == 1 }).to be true
      end

      it "exclui resposta da API que contém campo error" do
        error_body = [
          {
            "id"            => 1,
            "name"          => "PAC",
            "company"       => { "name" => "Correios" },
            "price"         => "15.50",
            "delivery_time" => 5,
            "error"         => "CEP de destino inválido"
          }
        ].to_json
        stub_request(:post, api_url)
          .to_return(status: 200, body: error_body, headers: { "Content-Type" => "application/json" })

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)

        expect(results.none? { |r| r[:service_id] == 1 }).to be true
      end

      it "não inclui serviço cujo id não está cadastrado como carrier habilitado" do
        unknown_body = [
          {
            "id"            => 999,
            "name"          => "Desconhecido",
            "company"       => { "name" => "Carrier X" },
            "price"         => "10.00",
            "delivery_time" => 3,
            "error"         => nil
          }
        ].to_json
        stub_request(:post, api_url)
          .to_return(status: 200, body: unknown_body, headers: { "Content-Type" => "application/json" })

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)

        expect(results.none? { |r| r[:service_id] == 999 }).to be true
      end

      it "ordena resultados por price_cents" do
        second_carrier = create(:shipping_carrier, me_service_id: 2)
        multi_body = [
          { "id" => 2, "name" => "Sedex", "company" => { "name" => "Correios" },
            "price" => "28.00", "delivery_time" => 2, "error" => nil },
          { "id" => 1, "name" => "PAC",   "company" => { "name" => "Correios" },
            "price" => "15.50", "delivery_time" => 5, "error" => nil }
        ].to_json
        stub_request(:post, api_url)
          .to_return(status: 200, body: multi_body, headers: { "Content-Type" => "application/json" })

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        carrier_results = results.select { |r| r[:service_id].positive? }

        expect(carrier_results.first[:price_cents]).to be <= carrier_results.last[:price_cents]
      end
    end

    context "quando a API retorna timeout" do
      before { stub_request(:post, api_url).to_timeout }

      it "retorna lista vazia sem lançar exceção" do
        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        expect(results.select { |r| r[:service_id].positive? }).to be_empty
      end
    end

    context "com produto sem dimensões" do
      before do
        product.update!(weight_g: nil, height_mm: nil, width_mm: nil, length_mm: nil)
        stub_request(:post, api_url)
          .to_return(status: 200, body: success_body, headers: { "Content-Type" => "application/json" })
      end

      it "não inclui opções de carrier (payload vazio → provider retorna [])" do
        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        expect(results.none? { |r| r[:service_id] == 1 }).to be true
      end
    end

    context "com retirada na loja habilitada" do
      before do
        setting.update!(local_pickup_enabled: true)
        stub_request(:post, api_url)
          .to_return(status: 200, body: success_body, headers: { "Content-Type" => "application/json" })
      end

      it "inclui opção de retirada na loja (service_id: -1, price_cents: 0)" do
        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        pickup = results.find { |r| r[:service_id] == -1 }

        expect(pickup).not_to be_nil
        expect(pickup[:price_cents]).to eq(0)
        expect(pickup[:carrier]).to eq("Retirada")
      end
    end

    context "com frete grátis habilitado" do
      before do
        setting.update!(free_shipping_enabled: true, free_shipping_above_cents: 5000)
        stub_request(:post, api_url)
          .to_return(status: 200, body: success_body, headers: { "Content-Type" => "application/json" })
      end

      it "inclui frete grátis quando total do pedido >= limite (price_cents: 8900 >= 5000)" do
        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        free = results.find { |r| r[:service_id] == 0 }

        expect(free).not_to be_nil
        expect(free[:price_cents]).to eq(0)
      end

      it "não inclui frete grátis quando total < limite" do
        setting.update!(free_shipping_above_cents: 10_000)

        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        free = results.find { |r| r[:service_id] == 0 }

        expect(free).to be_nil
      end
    end

    context "sem me_access_token configurado" do
      before { setting.update!(me_access_token: "") }

      it "retorna lista vazia sem tentar chamada HTTP" do
        results = described_class.new.calculate(to_zipcode: "04568000", items: items)
        expect(results).to be_empty
        expect(WebMock).not_to have_requested(:post, api_url)
      end
    end

    context "injetando provider customizado" do
      it "aceita provider externo via construtor, sem chamada HTTP" do
        fake_option = {
          provider: "Test", service_id: 42, carrier: "Fake", service: "Express",
          price_cents: 500, delivery_days: 1, currency: "BRL", error: nil
        }
        fake_provider = instance_double("FakeProvider", calculate: [double(to_h: fake_option)])

        results = described_class.new(providers: [fake_provider])
                                 .calculate(to_zipcode: "04568000", items: items)

        expect(results.find { |r| r[:service_id] == 42 }).not_to be_nil
        expect(WebMock).not_to have_requested(:post, api_url)
      end
    end
  end
end
