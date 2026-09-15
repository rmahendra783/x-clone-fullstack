Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post "auth/signup", to: "auth#signup"
      post "auth/login",  to: "auth#login"

      resources :users, only: [:show], param: :username do
        member do
          post :follow # Toggles follow/unfollow
        end
      end

      resources :tweets, only: [:index, :create, :destroy] do
        member do
          post :like
        end
      end
    end
  end
end