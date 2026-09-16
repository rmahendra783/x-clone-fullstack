class Notification < ApplicationRecord
  belongs_to :recipient, class_name: "User"
  belongs_to :actor, class_name: "User"
  belongs_to :notifiable, polymorphic: true

  # Actions: 'liked_tweet', 'replied_tweet', 'followed_user'
  validates :action, presence: true

  scope :unread, -> { where(read_at: nil) }
  scope :recent, -> { order(created_at: :desc).limit(20) }

  after_create_commit :broadcast_notification

  private

  def broadcast_notification
    NotificationChannel.broadcast_to(recipient, {
      id: id,
      actor_username: actor.username,
      action: action,
      notifiable_id: notifiable_id,
      notifiable_type: notifiable_type,
      read: false,
      created_at: created_at
    })
  end
end