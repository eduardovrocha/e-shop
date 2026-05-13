require "rails_helper"

RSpec.describe CustomerUpsertService, type: :service do
  let(:base_address) do
    {
      "cep"          => "01310-100",
      "address"      => "Av. Paulista",
      "number"       => "1000",
      "complement"   => "",
      "neighborhood" => "Bela Vista",
      "city"         => "São Paulo",
      "state"        => "SP"
    }
  end

  let!(:order) do
    create(:order,
      customer_email: "joao@example.com",
      customer_name:  "João Silva",
      customer_phone: "11999999999",
      delivery_method: "pickup"
    )
  end

  describe ".call" do
    context "criação de customer" do
      it "cria um novo customer quando o e-mail não existe" do
        expect { described_class.call(order) }.to change(Customer, :count).by(1)
        expect(Customer.last.email).to eq("joao@example.com")
      end

      it "reutiliza customer existente com o mesmo e-mail" do
        existing = create(:customer, email: "joao@example.com")
        expect { described_class.call(order) }.not_to change(Customer, :count)
        expect(Customer.last).to eq(existing)
      end

      it "normaliza o e-mail para minúsculas" do
        order.update_column(:customer_email, "JOAO@EXAMPLE.COM")
        described_class.call(order)
        expect(Customer.last.email).to eq("joao@example.com")
      end

      it "atualiza o nome do customer se o pedido tiver nome" do
        existing = create(:customer, email: "joao@example.com", name: "Nome Antigo")
        described_class.call(order)
        expect(existing.reload.name).to eq("João Silva")
      end

      it "não sobrescreve o telefone se o customer já tiver um" do
        existing = create(:customer, email: "joao@example.com", phone: "11888888888")
        described_class.call(order)
        expect(existing.reload.phone).to eq("11888888888")
      end

      it "preenche telefone se o customer ainda não tiver" do
        existing = create(:customer, email: "joao@example.com", phone: nil)
        described_class.call(order)
        expect(existing.reload.phone).to eq("11999999999")
      end

      it "vincula o customer ao pedido via customer_id" do
        described_class.call(order)
        expect(order.reload.customer_id).to eq(Customer.last.id)
      end

      it "retorna nil silenciosamente quando customer_email está ausente" do
        order.update_column(:customer_email, nil)
        expect(described_class.call(order)).to be_nil
        expect(Customer.count).to eq(0)
      end
    end

    context "upsert de endereço" do
      let!(:delivery_order) do
        create(:order,
          customer_email:   "maria@example.com",
          customer_name:    "Maria",
          delivery_method:  "delivery",
          shipping_address: base_address
        )
      end

      it "cria endereço para pedido de entrega" do
        expect { described_class.call(delivery_order) }.to change(CustomerAddress, :count).by(1)
        addr = CustomerAddress.last
        expect(addr.street).to eq("Av. Paulista")
        expect(addr.city).to eq("São Paulo")
      end

      it "não duplica endereço com mesmo CEP e rua" do
        described_class.call(delivery_order)
        expect { described_class.call(delivery_order) }.not_to change(CustomerAddress, :count)
      end

      it "marca como padrão quando é o primeiro endereço do customer" do
        described_class.call(delivery_order)
        expect(CustomerAddress.last.is_default).to be true
      end

      it "não cria endereço para pedido de retirada (pickup)" do
        expect { described_class.call(order) }.not_to change(CustomerAddress, :count)
      end

      it "não cria endereço quando shipping_address está ausente" do
        delivery_order.update_column(:shipping_address, nil)
        described_class.call(delivery_order)
        expect(CustomerAddress.count).to eq(0)
      end
    end

    context "tratamento de erros" do
      it "retorna nil sem lançar exceção quando upsert_customer falha" do
        allow(Customer).to receive(:find_or_initialize_by).and_raise(ActiveRecord::ConnectionNotEstablished)
        expect(described_class.call(order)).to be_nil
      end

      it "reverte customer se upsert_address falhar (transação atômica)" do
        delivery_order = create(:order,
          customer_email:   "ana@example.com",
          delivery_method:  "delivery",
          shipping_address: base_address
        )
        allow_any_instance_of(CustomerAddress).to receive(:save!).and_raise(ActiveRecord::RecordInvalid.new(CustomerAddress.new))

        expect { described_class.call(delivery_order) }.not_to change(Customer, :count)
        expect(CustomerAddress.count).to eq(0)
      end
    end
  end

  describe ".backfill_all" do
    # Override the top-level let!(:order) — its factory default is status: "paid",
    # which would be picked up by backfill_all and pollute these isolated tests.
    let!(:order) { create(:order, :pending) }

    it "processa pedidos pagos sem customer_id" do
      paid_order = create(:order, status: "paid", customer_id: nil)
      expect { described_class.backfill_all }.to change(Customer, :count).by(1)
      expect(paid_order.reload.customer_id).not_to be_nil
    end

    it "ignora pedidos sem e-mail" do
      create(:order, status: "paid", customer_id: nil, customer_email: nil)
      expect { described_class.backfill_all }.not_to change(Customer, :count)
    end

    it "ignora pedidos com status pending" do
      create(:order, status: "pending", customer_id: nil)
      expect { described_class.backfill_all }.not_to change(Customer, :count)
    end
  end
end
