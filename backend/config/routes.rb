Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Authentication endpoints
      post "auth/signup", to: "auth#signup"
      post "auth/login",  to: "auth#login"

      # User Profile endpoint lookup via username
      resources :users, only: [:show], param: :username

      # Tweets and Likes
      resources :tweets, only: [:index, :create, :destroy] do
        member do
          post :like
        end
      end
    end
  end
end