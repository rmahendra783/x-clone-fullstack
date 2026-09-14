# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
Tweet.destroy_all

Tweet.create!([
  { username: "satya", content: "Building a scalable Twitter clone with Rails 8 & React!", likes_count: 5 },
  { username: "rails_core", content: "Rails 8 brings Solid Queue, Solid Cache, and Kamal by default.", likes_count: 12 },
  { username: "tech_lead", content: "Indexes on created_at make feed reads lightning fast.", likes_count: 8 }
])

puts "Created #{Tweet.count} tweets!"