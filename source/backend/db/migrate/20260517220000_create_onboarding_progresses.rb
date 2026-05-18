class CreateOnboardingProgresses < ActiveRecord::Migration[7.2]
  STATUSES = %w[not_started in_progress completed skipped phase_2_ready].freeze

  def change
    create_table :onboarding_progresses do |t|
      t.references :user,          null: false, foreign_key: { on_delete: :cascade }
      t.references :store_setting, null: false, foreign_key: { on_delete: :cascade }

      t.string  :status,           null: false, default: "not_started"
      t.integer :current_phase,    null: false, default: 1
      t.string  :current_step_id

      t.jsonb   :completed_steps,  null: false, default: []
      t.jsonb   :skipped_steps,    null: false, default: []

      t.datetime :started_at
      t.datetime :completed_at
      t.datetime :last_seen_at

      t.timestamps
    end

    add_index :onboarding_progresses,
              [ :user_id, :store_setting_id ],
              unique: true,
              name:   :index_onboarding_progresses_on_user_and_store

    add_check_constraint :onboarding_progresses,
      "status IN ('#{STATUSES.join("','")}')",
      name: "onboarding_progresses_status_check"

    add_check_constraint :onboarding_progresses,
      "current_phase IN (1, 2)",
      name: "onboarding_progresses_phase_check"
  end
end
