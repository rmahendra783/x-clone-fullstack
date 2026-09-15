module Api
  module V1
    class TweetsController < ApplicationController
      wrap_parameters false
      include Rails.application.routes.url_helpers

      before_action :authenticate_request!, only: [:create, :destroy, :like]

      PAGE_SIZE = 10

      # GET /api/v1/tweets
      def index
        current_req_user = extract_optional_user

        tweets_scope = if params[:feed] == "following"
          if current_req_user
            followed_ids = current_req_user.following.select(:id)
            Tweet.root_tweets.where(user_id: followed_ids)
          else
            Tweet.none
          end
        else
          Tweet.root_tweets
        end

        if params[:cursor].present?
          tweets_scope = tweets_scope.where("tweets.id < ?", params[:cursor].to_i)
        end

        fetched = tweets_scope.includes(:user, :likes)
                              .with_attached_image
                              .order(id: :desc)
                              .limit(PAGE_SIZE + 1)
                              .to_a

        has_more = fetched.size > PAGE_SIZE
        records = has_more ? fetched.first(PAGE_SIZE) : fetched
        next_cursor = has_more ? records.last.id : nil

        render json: {
          tweets: format_tweets(records, current_req_user),
          next_cursor: next_cursor
        }, status: :ok
      end

      # GET /api/v1/tweets/:id
      def show
        tweet = Tweet.includes(:user, :likes).with_attached_image.find(params[:id])
        current_req_user = extract_optional_user

        replies = tweet.replies.includes(:user, :likes)
                               .with_attached_image
                               .order(created_at: :desc)

        render json: {
          tweet: format_single_tweet(tweet, current_req_user),
          replies: format_tweets(replies, current_req_user)
        }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found" }, status: :not_found
      end

      # POST /api/v1/tweets
      def create
        sanitized_params = tweet_params.dup
        sanitized_params[:content] = nil if sanitized_params[:content].blank?

        tweet = current_user.tweets.build(sanitized_params)
        tweet.likes_count = 0
        tweet.replies_count = 0

        if tweet.save
          render json: format_single_tweet(tweet, current_user), status: :created
        else
          render json: { errors: tweet.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/tweets/:id
      def destroy
        tweet = current_user.tweets.find(params[:id])
        tweet.destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found or unauthorized" }, status: :not_found
      end

      # POST /api/v1/tweets/:id/like
      def like
        tweet = Tweet.find(params[:id])
        existing_like = tweet.likes.find_by(user_id: current_user.id)

        if existing_like
          existing_like.destroy
          Tweet.decrement_counter(:likes_count, tweet.id)
          liked = false
        else
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

      def tweet_params
        if params[:tweet].is_a?(ActionController::Parameters) || params[:tweet].is_a?(Hash)
          params.require(:tweet).permit(:content, :parent_id, :image)
        else
          params.permit(:content, :parent_id, :image)
        end
      end

      # Fixed signature: tweet is required, req_user defaults to nil
      def format_single_tweet(tweet, req_user = nil)
        image_url = nil
        if tweet.image.attached?
          image_url = Rails.application.routes.url_helpers.rails_blob_url(tweet.image, host: request.base_url)
        end

        {
          id: tweet.id,
          content: tweet.content,
          likes_count: tweet.likes_count,
          replies_count: tweet.replies_count,
          created_at: tweet.created_at,
          username: tweet.username,
          parent_id: tweet.parent_id,
          image_url: image_url,
          liked_by_current_user: req_user ? tweet.likes.any? { |l| l.user_id == req_user.id } : false
        }
      end

      def format_tweets(tweets, req_user = nil)
        tweets.map { |t| format_single_tweet(t, req_user) }
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