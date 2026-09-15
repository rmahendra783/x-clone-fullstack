module Api
  module V1
    class TweetsController < ApplicationController
      wrap_parameters false

      # Mutating operations require a valid JWT token; timeline reads remain open
      before_action :authenticate_request!, only: [:create, :destroy, :like]

      # GET /api/v1/tweets?feed=following OR /api/v1/tweets (default: For You)
      def index
        current_req_user = extract_optional_user

        tweets_scope = if params[:feed] == "following"
          if current_req_user
            # Fetch tweets from users the current user follows + their own tweets
            followed_ids = current_req_user.following.select(:id)
            Tweet.where(user_id: followed_ids)
          else
            Tweet.none
          end
        else
          # "For You" global feed
          Tweet.all
        end

        # Eager load user and likes to eliminate N+1 queries
        tweets = tweets_scope.includes(:user, :likes).order(created_at: :desc).limit(50)

        rendered_tweets = tweets.map do |tweet|
          {
            id: tweet.id,
            content: tweet.content,
            likes_count: tweet.likes_count,
            created_at: tweet.created_at,
            username: tweet.username,
            liked_by_current_user: current_req_user ? tweet.likes.any? { |l| l.user_id == current_req_user.id } : false
          }
        end

        render json: rendered_tweets, status: :ok
      end

      # POST /api/v1/tweets
      def create
        # Secure: Associate the tweet directly with current_user
        tweet = current_user.tweets.build(tweet_params)
        tweet.likes_count = 0

        if tweet.save
          render json: {
            id: tweet.id,
            content: tweet.content,
            likes_count: tweet.likes_count,
            created_at: tweet.created_at,
            username: current_user.username,
            liked_by_current_user: false
          }, status: :created
        else
          render json: { errors: tweet.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/tweets/:id
      def destroy
        # Secure: Users can only delete their own tweets
        tweet = current_user.tweets.find(params[:id])
        tweet.destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found or unauthorized" }, status: :not_found
      end

      # POST /api/v1/tweets/:id/like (Relational toggle using user_id foreign key)
      def like
        tweet = Tweet.find(params[:id])
        existing_like = tweet.likes.find_by(user_id: current_user.id)

        if existing_like
          # UNLIKE
          existing_like.destroy
          Tweet.decrement_counter(:likes_count, tweet.id)
          liked = false
        else
          # LIKE
          tweet.likes.create!(user: current_user)
          Tweet.increment_counter(:likes_count, tweet.id)
          liked = true
        end

        tweet.reload
        render json: {
          id: tweet.id,
          likes_count: tweet.likes_count,
          liked: liked
        }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found" }, status: :not_found
      rescue ActiveRecord::RecordNotUnique
        render json: { error: "Duplicate action prevented" }, status: :conflict
      end

      private

      # Strong parameters: Client cannot forge or pass username
      def tweet_params
        params.require(:tweet).permit(:content)
      end

      # Helper for GET feed: checks if a token is present without blocking guest users
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