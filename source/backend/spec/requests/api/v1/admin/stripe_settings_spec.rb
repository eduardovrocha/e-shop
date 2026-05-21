require "rails_helper"

RSpec.describe "Admin Stripe Setting", type: :request do
  let!(:admin)         { create(:user, email: "admin@example.com", role: "admin") }
  let(:admin_headers)  { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }

  describe "GET /api/v1/admin/stripe_setting" do
    it "returns active mode and per-mode configured flags without leaking secrets" do
      StripeSetting.current.update!(
        test_publishable_key: "pk_test_abcd1234",
        test_secret_key:      "sk_test_zyx9876"
      )

      get "/api/v1/admin/stripe_setting", headers: admin_headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["active_mode"]).to eq("test")
      expect(body.dig("test", "publishable_key_configured")).to be(true)
      expect(body.dig("test", "secret_key_configured")).to be(true)
      expect(body.dig("test", "webhook_secret_configured")).to be(false)
      expect(body.dig("live", "publishable_key_configured")).to be(false)
      # No plaintext secrets in the payload
      expect(body.to_s).not_to include("sk_test_zyx9876")
      expect(body.to_s).not_to include("pk_test_abcd1234")
    end
  end

  describe "PATCH /api/v1/admin/stripe_setting" do
    it "saves provided fields and does not overwrite existing keys with blanks" do
      StripeSetting.current.update!(test_publishable_key: "pk_test_existing")

      patch "/api/v1/admin/stripe_setting",
        params: {
          stripe_setting: {
            test_publishable_key: "",
            test_secret_key:      "sk_test_new"
          }
        },
        headers: admin_headers,
        as: :json

      expect(response).to have_http_status(:no_content)
      setting = StripeSetting.current
      expect(setting.test_publishable_key).to eq("pk_test_existing")
      expect(setting.test_secret_key).to eq("sk_test_new")
    end
  end

  describe "POST /api/v1/admin/stripe_setting/switch_mode" do
    context "when target mode has missing keys" do
      it "returns 422 with the list of missing fields" do
        post "/api/v1/admin/stripe_setting/switch_mode",
          params: { new_mode: "live" },
          headers: admin_headers,
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body["error"]).to include("Faltam credenciais")
      end
    end

    context "when target mode is fully configured" do
      before do
        StripeSetting.current.update!(
          live_publishable_key: "pk_live_x",
          live_secret_key:      "sk_live_x",
          live_webhook_secret:  "whsec_live_x"
        )
      end

      it "switches mode and records an audit row in the same transaction" do
        expect {
          post "/api/v1/admin/stripe_setting/switch_mode",
            params: { new_mode: "live" },
            headers: admin_headers,
            as: :json
        }.to change(StripeModeChange, :count).by(1)

        expect(response).to have_http_status(:no_content)

        change = StripeModeChange.last
        expect(StripeSetting.current.active_mode).to eq("live")
        expect(change.previous_mode).to eq("test")
        expect(change.new_mode).to eq("live")
        expect(change.user_id).to eq(admin.id)
      end

      it "rejects switching to the same mode with 422" do
        post "/api/v1/admin/stripe_setting/switch_mode",
          params: { new_mode: "test" },
          headers: admin_headers,
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body["error"]).to include("ativo")
      end
    end

    context "production live → test" do
      before do
        # Configure both modes so switch is unblocked by credentials check
        StripeSetting.current.update!(
          active_mode:          "live",
          test_publishable_key: "pk_test_x",
          test_secret_key:      "sk_test_x",
          test_webhook_secret:  "whsec_test_x",
          live_publishable_key: "pk_live_x",
          live_secret_key:      "sk_live_x",
          live_webhook_secret:  "whsec_live_x"
        )
        allow(Rails.env).to receive(:production?).and_return(true)
      end

      it "rejects without confirmation phrase" do
        post "/api/v1/admin/stripe_setting/switch_mode",
          params: { new_mode: "test" },
          headers: admin_headers,
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body["error"]).to include("Frase de confirmação")
        expect(StripeSetting.current.active_mode).to eq("live")
      end

      it "rejects when phrase has accents or differs from the canonical form" do
        post "/api/v1/admin/stripe_setting/switch_mode",
          params: { new_mode: "test", confirmation_phrase: "ATIVAR MODO TESTE EM PRODUÇÃO" },
          headers: admin_headers,
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(StripeSetting.current.active_mode).to eq("live")
      end

      it "accepts the exact canonical phrase" do
        post "/api/v1/admin/stripe_setting/switch_mode",
          params: { new_mode: "test", confirmation_phrase: "ATIVAR MODO TESTE EM PRODUCAO" },
          headers: admin_headers,
          as: :json

        expect(response).to have_http_status(:no_content)
        expect(StripeSetting.current.active_mode).to eq("test")
      end
    end
  end
end
