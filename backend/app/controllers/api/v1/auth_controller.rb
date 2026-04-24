module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate_user!, only: [:signup, :login]

      # POST /api/v1/signup
      def signup
        user = User.new(signup_params)

        if user.save
          token = JwtService.encode(user_id: user.id)
          render json: {
            message: "Account created successfully",
            user: user_response(user),
            token: token
          }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/login
      def login
        user = User.find_by(email: params[:email]&.downcase)

        if user&.authenticate(params[:password])
          token = JwtService.encode(user_id: user.id)
          render json: {
            message: "Logged in successfully",
            user: user_response(user),
            token: token
          }, status: :ok
        else
          render json: { error: "Invalid email or password" }, status: :unauthorized
        end
      end

      # GET /api/v1/me
      def me
        render json: { user: user_response(current_user) }, status: :ok
      end

      private

      def signup_params
        params.permit(:name, :email, :password, :password_confirmation)
      end

      def user_response(user)
        {
          id: user.id,
          name: user.name,
          email: user.email
        }
      end
    end
  end
end
