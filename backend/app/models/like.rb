class Like < ApplicationRecord
  belongs_to :tweet

  validates :username, presence: true
  validates :tweet_id, uniqueness: { scope: :username, message: "has already been liked by this user" }
end