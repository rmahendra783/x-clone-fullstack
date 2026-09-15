module Api
  module V1
    class TweetsController < ApplicationController
      wrap_parameters false

      # Mutating operations require a valid JWT token; timeline reads remain open
      before_action :authenticate_request!, only: [:create, :destroy, :like]

      PAGE_SIZE = 10

      # GET /api/v1/tweets?feed=following&cursor=123
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

        # Keyset pagination: load records older than the provided cursor
        if params[:cursor].present?
          tweets_scope = tweets_scope.where("tweets.id < ?", params[:cursor].to_i)
        end

        # Request 1 extra record to determine if there is a next page
        fetched = tweets_scope.includes(:user, :likes)
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

      # GET /api/v1/tweets/:id (Fetch tweet details + all child replies)
      def show
        tweet = Tweet.includes(:user, :likes).find(params[:id])
        current_req_user = extract_optional_user

        # CHANGED: order(created_at: :desc) so newest comments come first
        replies = tweet.replies.includes(:user, :likes).order(created_at: :desc)

        render json: {
          tweet: format_single_tweet(tweet, current_req_user),
          replies: format_tweets(replies, current_req_user)
        }, status: :ok
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Tweet not found" }, status: :not_found
      end

      # POST /api/v1/tweets
      def create
        tweet = current_user.tweets.build(tweet_params)
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

      # Strong parameters: Client can send optional parent_id for threaded replies
      def tweet_params
        params.require(:tweet).permit(:content, :parent_id)
      end

      def format_single_tweet(tweet, req_user)
        {
          id: tweet.id,
          content: tweet.content,
          likes_count: tweet.likes_count,
          replies_count: tweet.replies_count,
          created_at: tweet.created_at,
          username: tweet.username,
          parent_id: tweet.parent_id,
          liked_by_current_user: req_user ? tweet.likes.any? { |l| l.user_id == req_user.id } : false
        }
      end

      def format_tweets(tweets, req_user)
        tweets.map { |t| format_single_tweet(t, req_user) }
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