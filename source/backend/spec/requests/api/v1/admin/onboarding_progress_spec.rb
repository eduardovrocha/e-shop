require "rails_helper"

RSpec.describe "Admin Onboarding Progress", type: :request do
  let!(:admin)        { create(:user, email: "admin@example.com",   role: "admin") }
  let!(:super_admin)  { create(:user, email: "support@example.com", role: "super_admin") }
  let!(:store)        { StoreSetting.instance }

  let(:admin_headers)       { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }
  let(:super_admin_headers) { { "Authorization" => "Bearer #{JwtService.encode(user_id: super_admin.id)}" } }

  describe "GET /api/v1/admin/onboarding/progress" do
    context "when no progress exists yet" do
      it "creates a not_started record and returns it" do
        expect {
          get "/api/v1/admin/onboarding/progress", headers: admin_headers
        }.to change(OnboardingProgress, :count).by(1)

        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["status"]).to eq("not_started")
        expect(body["current_phase"]).to eq(1)
        expect(body["completed_steps"]).to eq([])
        expect(body["skipped_steps"]).to eq([])
        expect(body).to have_key("next_eligible_phase_2_at")
      end
    end

    context "when progress already exists" do
      let!(:progress) { create(:onboarding_progress, :in_progress, user: admin, store_setting: store) }

      it "returns the existing record without creating a new one" do
        expect {
          get "/api/v1/admin/onboarding/progress", headers: admin_headers
        }.not_to change(OnboardingProgress, :count)

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["status"]).to eq("in_progress")
        expect(response.parsed_body["current_step_id"]).to eq("store_config_name")
      end

      it "updates last_seen_at" do
        previous_seen = progress.last_seen_at
        get "/api/v1/admin/onboarding/progress", headers: admin_headers
        expect(progress.reload.last_seen_at).not_to eq(previous_seen)
      end
    end

    it "rejects unauthenticated requests with 401" do
      get "/api/v1/admin/onboarding/progress"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PATCH /api/v1/admin/onboarding/progress" do
    let!(:progress) { create(:onboarding_progress, :in_progress, user: admin, store_setting: store) }

    it "updates current_step_id and last_seen_at" do
      patch "/api/v1/admin/onboarding/progress",
        params:  { current_step_id: "products_create_first" },
        headers: admin_headers,
        as:      :json

      expect(response).to have_http_status(:ok)
      expect(progress.reload.current_step_id).to eq("products_create_first")
      expect(progress.last_seen_at).not_to be_nil
    end

    it "appends step ids to completed_steps without duplicates" do
      patch "/api/v1/admin/onboarding/progress",
        params:  { completed_step: "welcome" },
        headers: admin_headers,
        as:      :json
      patch "/api/v1/admin/onboarding/progress",
        params:  { completed_step: "welcome" },
        headers: admin_headers,
        as:      :json

      expect(progress.reload.completed_steps).to eq([ "welcome" ])
    end

    it "appends step ids to skipped_steps" do
      patch "/api/v1/admin/onboarding/progress",
        params:  { skipped_step: "content_intro" },
        headers: admin_headers,
        as:      :json

      expect(progress.reload.skipped_steps).to eq([ "content_intro" ])
    end

    it "rejects unknown status values silently (drops the field)" do
      patch "/api/v1/admin/onboarding/progress",
        params:  { status: "invalid_status", current_step_id: "x" },
        headers: admin_headers,
        as:      :json

      expect(response).to have_http_status(:ok)
      expect(progress.reload.status).to eq("in_progress")
      expect(progress.current_step_id).to eq("x")
    end
  end

  describe "POST /api/v1/admin/onboarding/progress/start" do
    it "marks the progress as in_progress with started_at" do
      post "/api/v1/admin/onboarding/progress/start", headers: admin_headers
      progress = OnboardingProgress.find_by!(user: admin)

      expect(response).to have_http_status(:ok)
      expect(progress.status).to eq("in_progress")
      expect(progress.started_at).not_to be_nil
    end

    it "is idempotent for already-started records (does not reset started_at)" do
      create(:onboarding_progress, :in_progress, user: admin, store_setting: store, started_at: 2.days.ago)
      original_started = OnboardingProgress.find_by(user: admin).started_at

      post "/api/v1/admin/onboarding/progress/start", headers: admin_headers
      expect(OnboardingProgress.find_by(user: admin).started_at).to be_within(1.second).of(original_started)
    end
  end

  describe "POST /api/v1/admin/onboarding/progress/complete-phase" do
    let!(:progress) { create(:onboarding_progress, :in_progress, user: admin, store_setting: store) }

    it "marks status as completed and sets completed_at for phase 1" do
      post "/api/v1/admin/onboarding/progress/complete-phase",
        params:  { phase: 1 },
        headers: admin_headers,
        as:      :json

      expect(response).to have_http_status(:ok)
      expect(progress.reload.status).to eq("completed")
      expect(progress.completed_at).not_to be_nil
      expect(progress.current_phase).to eq(2)
    end

    it "marks completed for phase 2 as well" do
      progress.update!(status: "phase_2_ready", current_phase: 2)
      post "/api/v1/admin/onboarding/progress/complete-phase",
        params:  { phase: 2 },
        headers: admin_headers,
        as:      :json

      expect(progress.reload.status).to eq("completed")
    end

    it "returns 422 for an invalid phase number" do
      post "/api/v1/admin/onboarding/progress/complete-phase",
        params:  { phase: 9 },
        headers: admin_headers,
        as:      :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /api/v1/admin/onboarding/progress/skip" do
    let!(:progress) { create(:onboarding_progress, :in_progress, user: admin, store_setting: store) }

    it "marks status as skipped when permanently is true" do
      post "/api/v1/admin/onboarding/progress/skip",
        params:  { permanently: true },
        headers: admin_headers,
        as:      :json

      expect(response).to have_http_status(:ok)
      expect(progress.reload.status).to eq("skipped")
    end

    it "keeps status as in_progress when permanently is false" do
      post "/api/v1/admin/onboarding/progress/skip",
        params:  { permanently: false },
        headers: admin_headers,
        as:      :json

      expect(progress.reload.status).to eq("in_progress")
    end
  end

  describe "POST /api/v1/admin/onboarding/progress/reset" do
    it "is forbidden for non-super-admin" do
      create(:onboarding_progress, :completed, user: admin, store_setting: store)

      post "/api/v1/admin/onboarding/progress/reset", headers: admin_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "resets the calling super_admin's own progress when no user_id is given" do
      create(:onboarding_progress, :completed, user: super_admin, store_setting: store)

      post "/api/v1/admin/onboarding/progress/reset", headers: super_admin_headers
      expect(response).to have_http_status(:ok)

      reset = OnboardingProgress.find_by(user: super_admin)
      expect(reset.status).to eq("not_started")
      expect(reset.completed_steps).to eq([])
      expect(reset.started_at).to be_nil
      expect(reset.completed_at).to be_nil
    end

    it "resets a target user's progress when user_id is provided" do
      create(:onboarding_progress, :completed, user: admin, store_setting: store)

      post "/api/v1/admin/onboarding/progress/reset",
        params:  { user_id: admin.id },
        headers: super_admin_headers,
        as:      :json

      expect(OnboardingProgress.find_by(user: admin).status).to eq("not_started")
    end

    it "writes an audit log line" do
      expect(Rails.logger).to receive(:info).with(/\[audit\] onboarding_progress_reset/).at_least(:once)
      allow(Rails.logger).to receive(:info).and_call_original

      post "/api/v1/admin/onboarding/progress/reset", headers: super_admin_headers
    end
  end

  describe "POST /api/v1/admin/onboarding/events/first-sale" do
    it "promotes completed users to phase_2_ready" do
      create(:onboarding_progress, :completed, user: admin, store_setting: store)

      post "/api/v1/admin/onboarding/events/first-sale", headers: admin_headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["affected"]).to eq(1)
      expect(OnboardingProgress.find_by(user: admin).status).to eq("phase_2_ready")
    end

    it "does not touch in_progress users" do
      create(:onboarding_progress, :in_progress, user: admin, store_setting: store)

      post "/api/v1/admin/onboarding/events/first-sale", headers: admin_headers
      expect(response.parsed_body["affected"]).to eq(0)
      expect(OnboardingProgress.find_by(user: admin).status).to eq("in_progress")
    end

    it "does not touch skipped users" do
      create(:onboarding_progress, :skipped, user: admin, store_setting: store)

      post "/api/v1/admin/onboarding/events/first-sale", headers: admin_headers
      expect(response.parsed_body["affected"]).to eq(0)
      expect(OnboardingProgress.find_by(user: admin).status).to eq("skipped")
    end

    it "is idempotent — running twice does not promote already-promoted users" do
      create(:onboarding_progress, :completed, user: admin, store_setting: store)

      post "/api/v1/admin/onboarding/events/first-sale", headers: admin_headers
      post "/api/v1/admin/onboarding/events/first-sale", headers: admin_headers

      expect(response.parsed_body["affected"]).to eq(0)
      expect(OnboardingProgress.find_by(user: admin).status).to eq("phase_2_ready")
    end
  end

  describe "uniqueness" do
    it "raises on attempting to create a duplicate (user_id, store_setting_id) pair" do
      create(:onboarding_progress, user: admin, store_setting: store)
      expect {
        create(:onboarding_progress, user: admin, store_setting: store)
      }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end
end
