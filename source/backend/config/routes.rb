Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
  mount ActionCable.server => "/cable"

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
      patch "orders/track/:token/items/:id/cancel", to: "tracking_items#cancel"
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
        resources :order_items, only: %i[index] do
          member do
            patch :start_production
            patch :complete_production
            patch :cancel
          end
        end
        get "production/metrics", to: "production_metrics#show"
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

        resources :categories, only: %i[index create update destroy] do
          collection { patch :reorder }
        end

        resource :shipping_settings, only: %i[show update] do
          post :test_connection, on: :collection
        end
        resources :shipping_carriers, only: %i[index update]

        # Onboarding tour progress
        scope :onboarding do
          get   "progress",                to: "onboarding_progress#show"
          patch "progress",                to: "onboarding_progress#update"
          post  "progress/start",          to: "onboarding_progress#start"
          post  "progress/complete-phase", to: "onboarding_progress#complete_phase"
          post  "progress/skip",           to: "onboarding_progress#skip"
          post  "progress/reset",          to: "onboarding_progress#reset"
          post  "events/first-sale",       to: "onboarding_progress#first_sale"
        end
      end
    end
  end
end
