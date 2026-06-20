require "rails_helper"

RSpec.describe "POST /api/v1/admin/orders (pedido manual)", type: :request do
  let!(:admin)  { create(:user, email: "manual-admin@example.com", password: "Password123!", role: "admin") }
  let(:headers) { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }
  let(:variant) { create(:product_variant, price_cents: 5000, stock_quantity: 10) }

  def post_order(payload)
    post "/api/v1/admin/orders", params: { manual_order: payload }, headers: headers, as: :json
  end

  let(:valid_payload) do
    {
      customer:                { name: "Maria Silva", email: "maria@example.com", phone: "11988887777" },
      items:                   [ { variant_id: variant.id, quantity: 2, unit_price_cents: 4500 } ],
      external_payment_method: "pix",
      shipping_mode:           "retirada",
      manual_discount_cents:   1000
    }
  end

  it "cria um pedido manual e retorna 201" do
    expect { post_order(valid_payload) }.to change(Order, :count).by(1)

    expect(response).to have_http_status(:created)
    body = JSON.parse(response.body)
    order = Order.last
    expect(order.source).to eq("manual")
    expect(order.total_cents).to eq(8000)
    expect(body.dig("order", "id") || body["id"]).to eq(order.id)
  end

  it "rejeita pedido sem itens com 422" do
    expect { post_order(valid_payload.merge(items: [])) }.not_to change(Order, :count)
    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error"]).to be_present
  end

  it "exige autenticação de admin" do
    post "/api/v1/admin/orders", params: { manual_order: valid_payload }, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  describe "GET index — origem" do
    let!(:web_order)    { create(:order, source: :web) }
    let!(:manual_order) { create(:order, :manual_source) }

    it "expõe o source de cada pedido" do
      get "/api/v1/admin/orders", headers: headers
      sources = JSON.parse(response.body)["orders"].map { |o| o["source"] }
      expect(sources).to include("web", "manual")
    end

    it "filtra por origem quando source é informado" do
      get "/api/v1/admin/orders", params: { source: "manual" }, headers: headers
      sources = JSON.parse(response.body)["orders"].map { |o| o["source"] }.uniq
      expect(sources).to eq([ "manual" ])
    end
  end
end
