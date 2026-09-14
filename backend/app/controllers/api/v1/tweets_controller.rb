module Api
  module V1
    class TweetsController < ApplicationController
      # GET /api/v1/tweets
      def index
        tweets = Tweet.order(created_at: :desc).limit(50)
        render json: tweets, status: :ok
      end

      # POST /api/v1/tweets
      def create
        tweet = Tweet.new(tweet_params)
        tweet.likes_count ||= 0

        if tweet.save
          render json: tweet, status: :created
        else
          render json: { errors: tweet.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/tweets/:id
      def destroy
        tweet = Tweet.find(params[:id])
        tweet.destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found" }, status: :not_found
      end

      # POST /api/v1/tweets/:id/like
      def like
        Tweet.increment_counter(:likes_count, params[:id])
        tweet = Tweet.find(params[:id])
        render json: { id: tweet.id, likes_count: tweet.likes_count }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found" }, status: :not_found
      end
      
      private

      # Standard Rails Strong Parameters
      def tweet_params
        params.require(:tweet).permit(:username, :content)
      end
    end
  end
end