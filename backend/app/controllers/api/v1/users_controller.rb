module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_request!, only: [:follow]

      # GET /api/v1/users/search?q=username
      def search
        if params[:q].blank?
          render json: { users: [] }, status: :ok
          return
        end

        query = "%#{params[:q].strip.downcase}%"
        users = User.where("LOWER(username) LIKE ?", query).limit(5)

        render json: {
          users: users.map { |u| { id: u.id, username: u.username } }
        }, status: :ok
      end

      # GET /api/v1/users/:username
      def show
        user = User.find_by!(username: params[:username])
        current_req_user = extract_optional_user

        user_tweets = user.tweets.root_tweets
                                 .includes(:likes, :retweets)
                                 .with_attached_image
                                 .order(id: :desc)

        is_following = current_req_user ? current_req_user.following.exists?(user.id) : false

        render json: {
          user: {
            id: user.id,
            username: user.username,
            created_at: user.created_at,
            tweets_count: user.tweets.count,
            followers_count: user.followers.count,
            following_count: user.following.count,
            is_following: is_following
          },
          tweets: format_tweets(user_tweets, current_req_user)
        }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "User not found" }, status: :not_found
      end

      # POST /api/v1/users/:username/follow
      def follow
        target_user = User.find_by!(username: params[:username])

        if target_user == current_user
          render json: { error: "You cannot follow yourself" }, status: :unprocessable_entity
          return
        end

        existing = current_user.active_relationships.find_by(followed_id: target_user.id)
        if existing
          existing.destroy
          is_following = false
        else
          current_user.active_relationships.create!(followed: target_user)
          is_following = true

          # Trigger notification when following someone
          Notification.create(
            recipient: target_user,
            actor: current_user,
            notifiable: target_user,
            action: "followed_user"
          )
        end

        render json: {
          following: is_following,
          followers_count: target_user.followers.count,
          following_count: target_user.following.count
        }, status: :ok
      end

      private

      def format_tweets(tweets, req_user)
        tweets.map do |tweet|
          image_url = tweet.image.attached? ? Rails.application.routes.url_helpers.rails_blob_url(tweet.image, host: request.base_url) : nil
          {
            id: tweet.id,
            content: tweet.content,
            likes_count: tweet.likes_count,
            replies_count: tweet.replies_count,
            retweets_count: tweet.retweets_count || 0,
            created_at: tweet.created_at,
            username: tweet.username,
            parent_id: tweet.parent_id,
            image_url: image_url,
            liked_by_current_user: req_user ? tweet.likes.any? { |l| l.user_id == req_user.id } : false,
            retweeted_by_current_user: req_user ? tweet.retweets.any? { |r| r.user_id == req_user.id } : false
          }
        end
      end

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