module Api
  module V1
    class TweetsController < ApplicationController
      wrap_parameters false

      def index
        tweets = Tweet.order(created_at: :desc).limit(50)
        # Optional: return whether current hardcoded user liked it or not
        render json: tweets, status: :ok
      end

      def create
        tweet = Tweet.new(tweet_params)
        tweet.likes_count ||= 0

        if tweet.save
          render json: tweet, status: :created
        else
          render json: { errors: tweet.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        tweet = Tweet.find(params[:id])
        tweet.destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found" }, status: :not_found
      end

      # POST /api/v1/tweets/:id/like (Toggle logic)
      def like
        tweet = Tweet.find(params[:id])
        username = params[:username] || "satya_dev"

        existing_like = tweet.likes.find_by(username: username)

        if existing_like
          # Already liked -> UNLIKE
          existing_like.destroy
          Tweet.decrement_counter(:likes_count, tweet.id)
          liked = false
        else
          # Not liked yet -> LIKE
          tweet.likes.create!(username: username)
          Tweet.increment_counter(:likes_count, tweet.id)
          liked = true
        end

        tweet.reload
        render json: { id: tweet.id, likes_count: tweet.likes_count, liked: liked }, status: :ok
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Tweet not found" }, status: :not_found
        rescue ActiveRecord::RecordNotUnique
          # Concurrency safety net
          render json: { error: "Duplicate like prevented" }, status: :conflict
      end

      private

      def tweet_params
        params.require(:tweet).permit(:username, :content)
      end
    end
  end
end