namespace :tasks do
  desc "Move overdue incomplete tasks to the next business day for all users"
  task move_overdue: :environment do
    today = Date.current
    User.find_each do |user|
      count = Task.auto_move_overdue_tasks(user, today)
      puts "Moved #{count} overdue tasks for user #{user.email}" if count > 0
    end
  end
end
