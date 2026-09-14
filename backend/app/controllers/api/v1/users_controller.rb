module Api
  module V1
    class UsersController < ApplicationController
      wrap_parameters false

      # GET /api/v1/users/:username
      def show
        # Case-insensitive username lookup
        user = User.find_by("LOWER(username) = ?", params[:username].to_s.downcase)

        unless user
          return render json: { error: "User not found" }, status: :not_found
        end

        # Preload likes on the user's tweets to avoid N+1 queries
        user_tweets = user.tweets.includes(:likes).order(created_at: :desc)
        current_req_user = extract_optional_user

        rendered_tweets = user_tweets.map do |tweet|
          {
            id: tweet.id,
            content: tweet.content,
            likes_count: tweet.likes_count,
            created_at: tweet.created_at,
            username: user.username,
            liked_by_current_user: current_req_user ? tweet.likes.any? { |l| l.user_id == current_req_user.id } : false
          }
        end

        render json: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            tweets_count: user_tweets.size
          },
          tweets: rendered_tweets
        }, status: :ok
      end

      private

      def extract_optional_user
        header = request.headers["Authorization"]
        return nil unless header.present?

        token = header.split(" ").last
        decoded = JsonWebToken.decode(token)
        decoded ? User.find_by(id: decoded[:user_id]) : nil
      rescue StandardError
        nil
      end
    end
  end
end