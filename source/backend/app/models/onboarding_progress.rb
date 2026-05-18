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
    self.status        = "in_progress" if status == "not_started"
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
