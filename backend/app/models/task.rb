class Task < ApplicationRecord
  belongs_to :user

  validates :title, presence: true
  validates :scheduled_date, presence: true

  scope :for_date, ->(date) { where(scheduled_date: date) }
  scope :incomplete, -> { where(completed: false) }
  scope :overdue, ->(date) { where(completed: false).where("scheduled_date < ?", date) }

  # Returns the next business day (skips Saturday/Sunday)
  def self.next_business_day(from_date)
    next_day = from_date + 1.day
    # Skip Saturday (6) and Sunday (0)
    next_day += 1.day while next_day.wday == 6 || next_day.wday == 0
    next_day
  end

  # Move all overdue incomplete tasks to the next business day from today
  def self.auto_move_overdue_tasks(user, today = Date.current)
    target_date = next_business_day(today - 1.day)
    # If target_date is before today, use today's next business day
    target_date = today if target_date < today
    # Ensure target is a business day
    target_date = next_business_day(target_date - 1.day) if target_date.wday == 6 || target_date.wday == 0

    overdue_tasks = user.tasks.overdue(today)
    overdue_tasks.update_all(scheduled_date: target_date) if overdue_tasks.any?
    overdue_tasks.count
  end

  # Explicitly move this task to the next business day
  def move_to_next_business_day
    new_date = self.class.next_business_day(scheduled_date)
    update(scheduled_date: new_date)
  end
end
