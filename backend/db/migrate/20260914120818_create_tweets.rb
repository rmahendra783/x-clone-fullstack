class CreateTweets < ActiveRecord::Migration[8.0]
  def change
    create_table :tweets do |t|
      t.string :username, null: false
      t.text :content, null: false
      t.integer :likes_count, default: 0, null: false

      t.timestamps
    end

    # System Design Rule: Latest feed fast read karne ke liye B-Tree index
    add_index :tweets, :created_at
  end
end