module Api
  module V1
    class TasksController < ApplicationController
      before_action :set_task, only: [:show, :update, :destroy, :move_to_next_day]

      # GET /api/v1/tasks?date=2026-04-01
      def index
        date = params[:date] ? Date.parse(params[:date]) : Date.current

        # Auto-move overdue tasks whenever user fetches tasks
        Task.auto_move_overdue_tasks(current_user, Date.current)

        tasks = current_user.tasks.for_date(date).order(created_at: :asc)
        render json: { tasks: tasks.map { |t| task_response(t) }, date: date.to_s }, status: :ok
      end

      # POST /api/v1/tasks
      def create
        date = params[:scheduled_date] ? Date.parse(params[:scheduled_date]) : Date.current
        task = current_user.tasks.new(task_params.merge(scheduled_date: date, completed: false))

        if task.save
          render json: { task: task_response(task) }, status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/tasks/:id
      def show
        render json: { task: task_response(@task) }, status: :ok
      end

      # PATCH /api/v1/tasks/:id
      def update
        if @task.update(task_params)
          render json: { task: task_response(@task) }, status: :ok
        else
          render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/tasks/:id
      def destroy
        @task.destroy
        render json: { message: "Task deleted" }, status: :ok
      end

      # PATCH /api/v1/tasks/:id/move_to_next_day
      def move_to_next_day
        @task.move_to_next_business_day
        render json: { task: task_response(@task), message: "Task moved to #{@task.scheduled_date}" }, status: :ok
      end

      # GET /api/v1/tasks/dates_with_tasks
      # Returns dates that have tasks in a given month
      def dates_with_tasks
        year = (params[:year] || Date.current.year).to_i
        month = (params[:month] || Date.current.month).to_i
        start_date = Date.new(year, month, 1)
        end_date = start_date.end_of_month

        dates = current_user.tasks
                            .where(scheduled_date: start_date..end_date)
                            .group(:scheduled_date)
                            .count

        render json: { dates: dates }, status: :ok
      end

      private

      def set_task
        @task = current_user.tasks.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Task not found" }, status: :not_found
      end

      def task_params
        params.permit(:title, :completed, :scheduled_date)
      end

      def task_response(task)
        {
          id: task.id,
          title: task.title,
          completed: task.completed,
          scheduled_date: task.scheduled_date.to_s,
          created_at: task.created_at,
          updated_at: task.updated_at
        }
      end
    end
  end
end
