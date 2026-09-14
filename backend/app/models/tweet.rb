class Tweet < ApplicationRecord
  belongs_to :user
  has_many :likes, dependent: :destroy

  validates :content, presence: true, length: { maximum: 280 }
  validates :likes_count, numericality: { greater_than_or_equal_to: 0 }

  # Frontend backward compatibility: author username expose karta hai
  def username
    user&.username || "anonymous"
  end
end