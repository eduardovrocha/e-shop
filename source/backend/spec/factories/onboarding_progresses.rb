FactoryBot.define do
  factory :onboarding_progress do
    user
    store_setting { StoreSetting.instance }

    status          { "not_started" }
    current_phase   { 1 }
    current_step_id { nil }
    completed_steps { [] }
    skipped_steps   { [] }

    trait :in_progress do
      status          { "in_progress" }
      started_at      { 1.hour.ago }
      current_step_id { "store_config_name" }
    end

    trait :completed do
      status          { "completed" }
      started_at      { 1.day.ago }
      completed_at    { 1.hour.ago }
      completed_steps { %w[welcome store_config_name store_config_logo] }
    end

    trait :skipped do
      status     { "skipped" }
      started_at { 1.day.ago }
    end

    trait :phase_2_ready do
      status        { "phase_2_ready" }
      started_at    { 2.days.ago }
      completed_at  { 1.day.ago }
      current_phase { 2 }
    end
  end
end
