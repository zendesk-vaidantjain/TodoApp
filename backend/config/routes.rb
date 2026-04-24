Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth routes
      post "signup", to: "auth#signup"
      post "login", to: "auth#login"
      get  "me",    to: "auth#me"

      # Task routes
      resources :tasks, only: [:index, :create, :show, :update, :destroy] do
        member do
          patch :move_to_next_day
        end
        collection do
          get :dates_with_tasks
        end
      end
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
