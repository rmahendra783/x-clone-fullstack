module Api
  module V1
    class NotificationsController < ApplicationController
      before_action :authenticate_request!

      # GET /api/v1/notifications
      def index
        notifications = current_user.notifications.includes(:actor).recent
        unread_count = current_user.notifications.unread.count

        render json: {
          notifications: notifications.map { |n|
            {
              id: n.id,
              actor_username: n.actor.username,
              action: n.action,
              notifiable_id: n.notifiable_id,
              notifiable_type: n.notifiable_type,
              read: n.read_at.present?,
              created_at: n.created_at
            }
          },
          unread_count: unread_count
        }, status: :ok
      end

      # POST /api/v1/notifications/mark_as_read
      def mark_as_read
        current_user.notifications.unread.update_all(read_at: Time.current)
        render json: { success: true }, status: :ok
      end
    end
  end
end