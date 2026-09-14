class ApplicationController < ActionController::API
  attr_reader :current_user

  private

  def authenticate_request!
    header = request.headers["Authorization"]
    token = header.split(" ").last if header

    decoded = JsonWebToken.decode(token) if token

    if decoded && (@current_user = User.find_by(id: decoded[:user_id]))
      # User authenticated successfully
    else
      render json: { error: "Unauthorized access. Please log in." }, status: :unauthorized
    end
  end
end