class AddParentAndRepliesCountToTweets < ActiveRecord::Migration[8.1]
  def change
    add_reference :tweets, :parent, foreign_key: { to_table: :tweets }, index: true, null: true
    add_column :tweets, :replies_count, :integer, default: 0, null: false
  end
end