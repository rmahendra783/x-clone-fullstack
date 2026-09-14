class Tweet < ApplicationRecord
  validates :username, presence: true, length: { maximum: 30 }
  validates :content, presence: true, length: { maximum: 280 }
  validates :likes_count, numericality: { greater_than_or_equal_to: 0 }
end


class Tweet < ApplicationRecord
  has_many :likes, dependent: :destroy

  validates :username, presence: true, length: { maximum: 30 }
  validates :content, presence: true, length: { maximum: 280 }
end