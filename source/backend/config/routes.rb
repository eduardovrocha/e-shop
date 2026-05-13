Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      get  "health",                    to: "health#show"
      get  "store",                     to: "store#show"
      resources :products, only: %i[index show]
      post "stock/check",                to: "stock#check"
      post "payments/create_intent",    to: "payments#create_intent"
      post "payments/webhook",          to: "payments#webhook"
      post "shipping/calculate",        to: "shipping#calculate"
      get  "orders/track/:token",       to: "tracking#show", as: :order_tracking
      resource :store_settings, only: %i[show update]

      namespace :admin do
        post   "auth/login",  to: "auth#login"
        delete "auth/logout", to: "auth#logout"

        get "dashboard/stats", to: "dashboard#stats"

        resource :settings,  only: %i[show update] do
          get :stripe_info, on: :collection
        end

        resources :orders, only: %i[index show update] do
          member do
            post :resend_email
          end
        end
        resources :customers, only: %i[index show]
        resources :products do
          collection { get :inventory }
          member     { patch :stock }
          resources :images, only: %i[create destroy], module: :products do
            collection { patch :reorder }
            member     { patch :primary }
          end
        end
        resources :coupons

        resource  :shipping_settings, only: %i[show update] do
          post :test_connection, on: :collection
        end
        resources :shipping_carriers, only: %i[index update]
      end
    end
  end
end
