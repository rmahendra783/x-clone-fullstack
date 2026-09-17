class AddRetweetsCountToTweets < ActiveRecord::Migration[8.1]
  def change
    add_column :tweets, :retweets_count, :integer, default: 0, null: false
  end
end