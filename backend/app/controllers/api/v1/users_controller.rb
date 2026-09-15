module Api
  module V1
    class UsersController < ApplicationController
      wrap_parameters false
      before_action :authenticate_request!, only: [:follow]

      # GET /api/v1/users/:username
      def show
        user = User.find_by("LOWER(username) = ?", params[:username].to_s.downcase)
        return render json: { error: "User not found" }, status: :not_found unless user

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

        is_following = current_req_user ? current_req_user.active_follows.exists?(followed_id: user.id) : false

        render json: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            tweets_count: user_tweets.size,
            followers_count: user.followers.count,
            following_count: user.following.count,
            is_following: is_following
          },
          tweets: rendered_tweets
        }, status: :ok
      end

      # POST /api/v1/users/:username/follow
      def follow
        target_user = User.find_by("LOWER(username) = ?", params[:username].to_s.downcase)
        return render json: { error: "User not found" }, status: :not_found unless target_user

        if current_user.id == target_user.id
          return render json: { error: "You cannot follow yourself" }, status: :unprocessable_entity
        end

        existing_follow = current_user.active_follows.find_by(followed_id: target_user.id)

        if existing_follow
          # UNFOLLOW
          existing_follow.destroy
          following = false
        else
          # FOLLOW
          current_user.active_follows.create!(followed: target_user)
          following = true
        end

        render json: {
          following: following,
          followers_count: target_user.followers.count,
          following_count: target_user.following.count
        }, status: :ok
      rescue ActiveRecord::RecordNotUnique
        render json: { error: "Duplicate action prevented" }, status: :conflict
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