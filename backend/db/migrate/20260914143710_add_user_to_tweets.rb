class AddUserToTweets < ActiveRecord::Migration[8.1]
  def change
    add_reference :tweets, :user, foreign_key: true
  end
end