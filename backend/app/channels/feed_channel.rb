class FeedChannel < ApplicationCable::Channel
  def subscribed
    stream_from "feed_channel"
  end

  def unsubscribed
    # Any cleanup when channel is unsubscribed
  end
end