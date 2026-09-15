class Tweet < ApplicationRecord
  belongs_to :user
  has_many :likes, dependent: :destroy

  # Self-referential associations for threaded comments
  belongs_to :parent, class_name: "Tweet", optional: true, counter_cache: :replies_count
  has_many :replies, class_name: "Tweet", foreign_key: "parent_id", dependent: :destroy

  validates :content, presence: true, length: { maximum: 280 }
  validates :likes_count, numericality: { greater_than_or_equal_to: 0 }
  validates :replies_count, numericality: { greater_than_or_equal_to: 0 }

  scope :root_tweets, -> { where(parent_id: nil) }

  def username
    user&.username || "anonymous"
  end
end