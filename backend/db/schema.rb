# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_14_141800) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "likes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "tweet_id", null: false
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index ["tweet_id", "username"], name: "index_likes_on_tweet_id_and_username", unique: true
    t.index ["tweet_id"], name: "index_likes_on_tweet_id"
  end

  create_table "tweets", force: :cascade do |t|
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.integer "likes_count", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index ["created_at"], name: "index_tweets_on_created_at"
  end

  add_foreign_key "likes", "tweets"
end
