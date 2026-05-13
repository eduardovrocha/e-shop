require "rails_helper"

RSpec.describe "Admin Auth", type: :request do
  let!(:admin) { create(:user, email: "admin@example.com", password: "Password123!", role: "admin") }

  before do
    allow(BruteForceProtection).to receive(:locked?).and_return(false)
    allow(BruteForceProtection).to receive(:record_failure)
    allow(BruteForceProtection).to receive(:reset)
    allow(BruteForceProtection).to receive(:ttl).and_return(900)
  end

  describe "POST /api/v1/admin/auth/login" do
    context "with valid credentials" do
      it "returns 200 with user data and sets HttpOnly cookie" do
        post "/api/v1/admin/auth/login",
          params: { email: "admin@example.com", password: "Password123!" },
          as: :json

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["user"]["email"]).to eq("admin@example.com")
        expect(response.parsed_body["user"]["role"]).to eq("admin")
        expect(response.headers["Set-Cookie"]).to include("admin_token")
      end

      it "calls BruteForceProtection.reset on success" do
        expect(BruteForceProtection).to receive(:reset).with("admin@example.com")

        post "/api/v1/admin/auth/login",
          params: { email: "admin@example.com", password: "Password123!" },
          as: :json
      end
    end

    context "with invalid password" do
      it "returns 401 Unauthorized" do
        post "/api/v1/admin/auth/login",
          params: { email: "admin@example.com", password: "wrong" },
          as: :json

        expect(response).to have_http_status(:unauthorized)
        expect(response.parsed_body["error"]).to be_present
      end

      it "records failed attempt via BruteForceProtection" do
        expect(BruteForceProtection).to receive(:record_failure).with("admin@example.com")

        post "/api/v1/admin/auth/login",
          params: { email: "admin@example.com", password: "wrong" },
          as: :json
      end
    end

    context "with non-existent email" do
      it "returns 401 Unauthorized" do
        post "/api/v1/admin/auth/login",
          params: { email: "ghost@example.com", password: "Password123!" },
          as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when account is locked" do
      before { allow(BruteForceProtection).to receive(:locked?).and_return(true) }

      it "returns 429 Too Many Requests with retry_after" do
        post "/api/v1/admin/auth/login",
          params: { email: "admin@example.com", password: "Password123!" },
          as: :json

        expect(response).to have_http_status(:too_many_requests)
        expect(response.parsed_body["retry_after"]).to eq(900)
        expect(response.parsed_body["error"]).to match(/bloqueada/i)
      end
    end
  end

  describe "DELETE /api/v1/admin/auth/logout" do
    it "returns 204 No Content" do
      delete "/api/v1/admin/auth/logout"
      expect(response).to have_http_status(:no_content)
    end
  end
end
