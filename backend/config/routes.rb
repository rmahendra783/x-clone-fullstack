Rails.application.routes.draw do
  mount ActionCable.server => "/cable"

  namespace :api do
    namespace :v1 do
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"

      resources :tweets, only: [:index, :show, :create, :destroy] do
        member do
          post :like
        end
      end

      get "users/search", to: "users#search"
      get "users/:username", to: "users#show"
      post "users/:username/follow", to: "users#follow"
    end
  end
end