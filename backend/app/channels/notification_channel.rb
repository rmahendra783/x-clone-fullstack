class NotificationChannel < ApplicationCable::Channel
  def subscribed
    # current_user is connected via connection or custom params
    user = User.find_by(id: params[:user_id])
    if user
      stream_for user
    else
      reject
    end
  end

  def unsubscribed
    # Any cleanup
  end
end