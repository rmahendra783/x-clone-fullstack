class AddUserToLikes < ActiveRecord::Migration[8.1]
  def change
    add_reference :likes, :user, foreign_key: true

    # String username column aur old index clean karein
    remove_index :likes, [:tweet_id, :username], if_exists: true
    remove_column :likes, :username, :string, if_exists: true

    # Database-level guarantee: One like per user per tweet
    add_index :likes, [:tweet_id, :user_id], unique: true
  end
end