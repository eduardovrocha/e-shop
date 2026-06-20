require "rails_helper"

RSpec.describe "GET /api/v1/admin/reports/orders", type: :request do
  let!(:admin)  { create(:user, email: "reports-admin@example.com", password: "Password123!", role: "admin") }
  let(:headers) { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }
  let(:variant) { create(:product_variant, unit_cost_cents: 2000) }

  before do
    order = create(:order, status: "processing")
    create(:order_item, order: order, product_variant: variant, product: variant.product,
           name: variant.product.name, size: variant.size, quantity: 1,
           unit_price_cents: 5000, subtotal_cents: 5000, unit_cost_cents: 2000)
  end

  it "retorna um PDF como attachment" do
    get "/api/v1/admin/reports/orders.pdf", params: { status: "processing" }, headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/pdf")
    expect(response.headers["Content-Disposition"]).to include("attachment")
    expect(response.body[0, 4]).to eq("%PDF")
  end

  it "gera o relatório agrupado quando não há status" do
    get "/api/v1/admin/reports/orders.pdf", headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/pdf")
  end

  it "rejeita status inválido com 422" do
    get "/api/v1/admin/reports/orders.pdf", params: { status: "inexistente" }, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "exige autenticação de admin" do
    get "/api/v1/admin/reports/orders.pdf", params: { status: "processing" }
    expect(response).to have_http_status(:unauthorized)
  end
end
