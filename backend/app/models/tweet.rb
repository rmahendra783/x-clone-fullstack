class Tweet < ApplicationRecord
  belongs_to :user
  has_many :likes, dependent: :destroy

  validates :content, presence: true, length: { maximum: 280 }
  validates :likes_count, numericality: { greater_than_or_equal_to: 0 }

  # Delegates author username to the associated user record
  def username
    user&.username || "anonymous"
  end
end