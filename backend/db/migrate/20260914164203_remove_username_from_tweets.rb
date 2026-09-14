class RemoveUsernameFromTweets < ActiveRecord::Migration[8.1]
  def change
    remove_column :tweets, :username, :string
  end
end