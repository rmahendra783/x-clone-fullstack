class CreateLikes < ActiveRecord::Migration[8.0]
  def change
    create_table :likes do |t|
      t.references :tweet, null: false, foreign_key: true
      t.string :username, null: false

      t.timestamps
    end

    # Database-level guarantee: One like per user per tweet
    add_index :likes, [:tweet_id, :username], unique: true
  end
end