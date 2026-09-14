class Like < ApplicationRecord
  belongs_to :tweet
  belongs_to :user

  # Enforces one like per user per tweet at model level (matches DB unique index)
  validates :tweet_id, uniqueness: { scope: :user_id, message: "has already been liked by this user" }
end