require "rails_helper"

RSpec.describe "Admin Release", :non_transactional, type: :request do
  before do
    tables = %w[
      orders order_items order_status_histories
      customers customer_addresses
      processed_webhook_events onboarding_progresses
      release_executions
    ]
    ActiveRecord::Base.connection.execute(
      "TRUNCATE #{tables.join(', ')} RESTART IDENTITY CASCADE"
    )
  end

  let!(:admin)        { create(:user, role: "admin") }
  let!(:super_admin)  { create(:user, role: "super_admin") }
  let(:admin_headers)       { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }
  let(:super_admin_headers) { { "Authorization" => "Bearer #{JwtService.encode(user_id: super_admin.id)}" } }

  describe "GET /api/v1/admin/release" do
    it "reports already_executed=false when no wipe has run" do
      get "/api/v1/admin/release", headers: admin_headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["already_executed"]).to be(false)
      expect(response.parsed_body["last_execution"]).to be_nil
    end

    it "surfaces last execution details after a wipe" do
      ReleaseExecution.create!(
        user:                super_admin,
        ip_address:          "1.2.3.4",
        orders_deleted:      5,
        order_items_deleted: 10,
        customers_deleted:   3,
        executed_at:         Time.current
      )

      get "/api/v1/admin/release", headers: admin_headers
      body = response.parsed_body
      expect(body["already_executed"]).to be(true)
      expect(body.dig("last_execution", "admin_email")).to eq(super_admin.email)
      expect(body.dig("last_execution", "orders_deleted")).to eq(5)
    end
  end

  describe "POST /api/v1/admin/release/wipe" do
    it "rejects non-super_admin callers with 403" do
      post "/api/v1/admin/release/wipe",
        params: { confirmation_phrase: "ZERAR DADOS PARA RELEASE" },
        headers: admin_headers, as: :json

      expect(response).to have_http_status(:forbidden)
    end

    it "rejects a missing/wrong confirmation phrase with 422" do
      post "/api/v1/admin/release/wipe",
        params: { confirmation_phrase: "wrong" },
        headers: super_admin_headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(ReleaseExecution.count).to eq(0)
    end

    it "executes the wipe with the exact phrase" do
      create(:order, status: "paid")

      expect {
        post "/api/v1/admin/release/wipe",
          params: { confirmation_phrase: "ZERAR DADOS PARA RELEASE" },
          headers: super_admin_headers, as: :json
      }.to change(ReleaseExecution, :count).by(1)
        .and change(Order, :count).to(0)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["ok"]).to be(true)
    end

    it "rejects re-execution without ALLOW_RELEASE_REWIPE" do
      ReleaseExecution.create!(user: super_admin, executed_at: Time.current)

      post "/api/v1/admin/release/wipe",
        params: { confirmation_phrase: "ZERAR DADOS PARA RELEASE" },
        headers: super_admin_headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("já executado")
    end
  end
end
