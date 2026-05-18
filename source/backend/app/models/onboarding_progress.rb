class OnboardingProgress < ApplicationRecord
  STATUSES = %w[not_started in_progress completed skipped phase_2_ready].freeze
  PHASES   = [ 1, 2 ].freeze

  belongs_to :user
  belongs_to :store_setting

  validates :status,        inclusion: { in: STATUSES }
  validates :current_phase, inclusion: { in: PHASES }
  validates :user_id,       uniqueness: { scope: :store_setting_id }

  validate :completed_steps_is_array
  validate :skipped_steps_is_array

  # Promotes every admin that finished Phase 1 to phase_2_ready for the given
  # store. Called from the Stripe webhook on the first paid order and from
  # the admin endpoint POST /events/first-sale. Idempotent — re-runs return
  # zero affected once the population is already phase_2_ready.
  def self.fire_first_sale!(store_setting:)
    where(store_setting_id: store_setting.id, status: "completed")
      .update_all(status: "phase_2_ready", updated_at: Time.current)
  end

  def add_completed_step(step_id)
    return if step_id.blank?
    self.completed_steps = (Array(completed_steps) + [ step_id.to_s ]).uniq
  end

  def add_skipped_step(step_id)
    return if step_id.blank?
    self.skipped_steps = (Array(skipped_steps) + [ step_id.to_s ]).uniq
  end

  def touch_last_seen
    self.last_seen_at = Time.current
  end

  def mark_started!
    self.started_at  ||= Time.current
    # not_started / phase_2_ready → in_progress. Other statuses are
    # left alone (already in_progress, completed, or skipped — the
    # caller-facing intent is "user wants the tour to run").
    self.status = "in_progress" if status == "not_started" || status == "phase_2_ready"
    save!
  end

  def mark_completed_phase!(phase)
    raise ArgumentError, "invalid phase" unless PHASES.include?(phase)

    case phase
    when 1
      self.status        = "completed" unless status == "completed"
      self.completed_at ||= Time.current
      self.current_phase = 2 if current_phase < 2
    when 2
      self.status        = "completed"
      self.completed_at ||= Time.current
    end
    save!
  end

  private

  def completed_steps_is_array
    errors.add(:completed_steps, "must be an array") unless completed_steps.is_a?(Array)
  end

  def skipped_steps_is_array
    errors.add(:skipped_steps, "must be an array") unless skipped_steps.is_a?(Array)
  end
end
