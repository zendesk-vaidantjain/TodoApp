class ApplicationController < ActionController::API
  before_action :authenticate_user!

  private

  def authenticate_user!
    token = extract_token
    if token
      decoded = JwtService.decode(token)
      if decoded
        @current_user = User.find_by(id: decoded[:user_id])
      end
    end

    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
  end

  def extract_token
    header = request.headers["Authorization"]
    header.split(" ").last if header.present? && header.start_with?("Bearer ")
  end

  def current_user
    @current_user
  end
end
