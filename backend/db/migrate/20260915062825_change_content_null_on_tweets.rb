class ChangeContentNullOnTweets < ActiveRecord::Migration[8.1]
  def change
    change_column_null :tweets, :content, true
  end
end