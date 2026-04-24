class CreateTasks < ActiveRecord::Migration[8.1]
  def change
    create_table :tasks do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title
      t.boolean :completed
      t.date :scheduled_date

      t.timestamps
    end
  end
end
