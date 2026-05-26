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

ActiveRecord::Schema[7.2].define(version: 2026_05_25_234130) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "categories", force: :cascade do |t|
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_categories_on_name", unique: true
    t.index ["position"], name: "index_categories_on_position"
  end

  create_table "coupon_codes", force: :cascade do |t|
    t.bigint "coupon_id", null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_coupon_codes_on_code", unique: true
    t.index ["coupon_id"], name: "index_coupon_codes_on_coupon_id"
  end

  create_table "coupon_products", force: :cascade do |t|
    t.bigint "coupon_id", null: false
    t.bigint "product_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["coupon_id", "product_id"], name: "index_coupon_products_on_coupon_id_and_product_id", unique: true
    t.index ["coupon_id"], name: "index_coupon_products_on_coupon_id"
    t.index ["product_id"], name: "index_coupon_products_on_product_id"
  end

  create_table "coupon_usages", force: :cascade do |t|
    t.bigint "coupon_id", null: false
    t.bigint "coupon_code_id"
    t.string "email", null: false
    t.bigint "order_id"
    t.integer "discount_amount_cents", null: false
    t.datetime "created_at", null: false
    t.string "stripe_intent_id"
    t.index ["coupon_code_id"], name: "index_coupon_usages_on_coupon_code_id"
    t.index ["coupon_id", "email"], name: "index_coupon_usages_on_coupon_id_and_email"
    t.index ["coupon_id"], name: "index_coupon_usages_on_coupon_id"
    t.index ["order_id"], name: "idx_coupon_usages_one_per_order", unique: true
    t.index ["order_id"], name: "index_coupon_usages_on_order_id"
    t.index ["stripe_intent_id"], name: "index_coupon_usages_on_stripe_intent_id", unique: true, where: "(stripe_intent_id IS NOT NULL)"
    t.check_constraint "discount_amount_cents > 0", name: "chk_coupon_usages_discount_amount_positive"
    t.check_constraint "order_id IS NOT NULL OR stripe_intent_id IS NOT NULL", name: "chk_coupon_usages_order_or_intent"
  end

  create_table "coupons", force: :cascade do |t|
    t.string "name", null: false
    t.integer "discount_percent", null: false
    t.boolean "applies_to_sale_items", default: false, null: false
    t.string "code_type", null: false
    t.string "public_code"
    t.string "scope_type", null: false
    t.datetime "starts_at"
    t.datetime "expires_at"
    t.integer "total_usage_limit"
    t.integer "per_customer_limit"
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_coupons_on_active"
    t.index ["public_code"], name: "index_coupons_on_public_code", unique: true, where: "(public_code IS NOT NULL)"
    t.check_constraint "code_type::text = ANY (ARRAY['public'::character varying::text, 'unique'::character varying::text])", name: "chk_coupons_code_type"
    t.check_constraint "discount_percent >= 1 AND discount_percent <= 100", name: "chk_coupons_discount_percent_range"
    t.check_constraint "scope_type::text = ANY (ARRAY['all_products'::character varying::text, 'specific_products'::character varying::text])", name: "chk_coupons_scope_type"
  end

  create_table "customer_addresses", force: :cascade do |t|
    t.bigint "customer_id", null: false
    t.string "zipcode", default: "", null: false
    t.string "street", default: "", null: false
    t.string "number", default: "", null: false
    t.string "complement", default: "", null: false
    t.string "neighborhood", default: "", null: false
    t.string "city", default: "", null: false
    t.string "state", default: "", null: false
    t.string "country", default: "BR", null: false
    t.boolean "is_default", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id", "is_default"], name: "index_customer_addresses_on_customer_id_and_is_default"
    t.index ["customer_id"], name: "index_customer_addresses_on_customer_id"
  end

  create_table "customers", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "name", default: "", null: false
    t.string "phone", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_customers_on_email", unique: true
  end

  create_table "onboarding_progresses", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "store_setting_id", null: false
    t.string "status", default: "not_started", null: false
    t.integer "current_phase", default: 1, null: false
    t.string "current_step_id"
    t.jsonb "completed_steps", default: [], null: false
    t.jsonb "skipped_steps", default: [], null: false
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "last_seen_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["store_setting_id"], name: "index_onboarding_progresses_on_store_setting_id"
    t.index ["user_id", "store_setting_id"], name: "index_onboarding_progresses_on_user_and_store", unique: true
    t.index ["user_id"], name: "index_onboarding_progresses_on_user_id"
    t.check_constraint "current_phase = ANY (ARRAY[1, 2])", name: "onboarding_progresses_phase_check"
    t.check_constraint "status::text = ANY (ARRAY['not_started'::character varying::text, 'in_progress'::character varying::text, 'completed'::character varying::text, 'skipped'::character varying::text, 'phase_2_ready'::character varying::text])", name: "onboarding_progresses_status_check"
  end

  create_table "order_items", force: :cascade do |t|
    t.bigint "order_id", null: false
    t.bigint "product_variant_id"
    t.bigint "product_id"
    t.string "name"
    t.string "size"
    t.integer "quantity", default: 1, null: false
    t.integer "unit_price_cents", default: 0, null: false
    t.integer "subtotal_cents", default: 0, null: false
    t.integer "production_status", default: 0, null: false
    t.datetime "production_started_at"
    t.datetime "production_completed_at"
    t.date "promised_completion_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "unit_cost_cents"
    t.index ["order_id"], name: "index_order_items_on_order_id"
    t.index ["product_id", "production_status"], name: "index_order_items_on_product_id_and_production_status"
    t.index ["product_id"], name: "index_order_items_on_product_id"
    t.index ["product_variant_id"], name: "index_order_items_on_product_variant_id"
    t.index ["production_status"], name: "index_order_items_on_production_status"
  end

  create_table "order_status_histories", force: :cascade do |t|
    t.bigint "order_id", null: false
    t.string "status", null: false
    t.string "title", null: false
    t.text "description"
    t.jsonb "metadata", default: {}
    t.string "created_by"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_order_status_histories_on_created_at"
    t.index ["order_id"], name: "index_order_status_histories_on_order_id"
    t.index ["status"], name: "index_order_status_histories_on_status"
  end

  create_table "orders", force: :cascade do |t|
    t.string "stripe_intent_id", null: false
    t.string "customer_name"
    t.string "customer_email"
    t.string "customer_phone"
    t.string "delivery_method", default: "pickup", null: false
    t.integer "items_total_cents", null: false
    t.integer "shipping_fee_cents", default: 0, null: false
    t.integer "total_cents", null: false
    t.string "status", default: "pending", null: false
    t.jsonb "items", default: [], null: false
    t.jsonb "shipping_address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "number"
    t.string "tracking_token", default: "", null: false
    t.string "tracking_code"
    t.text "notes"
    t.string "carrier"
    t.string "shipping_service"
    t.date "estimated_delivery"
    t.bigint "customer_id"
    t.date "promised_completion_date"
    t.integer "installment_count"
    t.string "payment_brand"
    t.string "payment_last4", limit: 4
    t.bigint "coupon_id"
    t.string "coupon_code_used"
    t.integer "discount_percent_applied"
    t.integer "discount_amount_cents"
    t.index ["coupon_id"], name: "index_orders_on_coupon_id"
    t.index ["created_at"], name: "index_orders_on_created_at"
    t.index ["customer_email"], name: "index_orders_on_customer_email"
    t.index ["customer_id"], name: "index_orders_on_customer_id"
    t.index ["number"], name: "index_orders_on_number", unique: true, where: "(number IS NOT NULL)"
    t.index ["status"], name: "index_orders_on_status"
    t.index ["stripe_intent_id"], name: "index_orders_on_stripe_intent_id", unique: true
    t.index ["tracking_token"], name: "index_orders_on_tracking_token", unique: true
    t.check_constraint "discount_amount_cents IS NULL OR discount_amount_cents >= 0", name: "chk_orders_discount_amount_cents_non_negative"
    t.check_constraint "discount_percent_applied IS NULL OR discount_percent_applied >= 1 AND discount_percent_applied <= 100", name: "chk_orders_discount_percent_applied_range"
  end

  create_table "processed_webhook_events", force: :cascade do |t|
    t.string "stripe_event_id", null: false
    t.string "event_type", null: false
    t.datetime "processed_at", null: false
    t.index ["stripe_event_id"], name: "index_processed_webhook_events_on_stripe_event_id", unique: true
  end

  create_table "product_variants", force: :cascade do |t|
    t.bigint "product_id", null: false
    t.string "size"
    t.string "color"
    t.string "sku", null: false
    t.integer "stock_quantity", default: 0, null: false
    t.integer "additional_price_cents", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "reserved_quantity", default: 0, null: false
    t.integer "price_cents", null: false
    t.integer "compare_at_price_cents"
    t.string "gender", default: "unissex", null: false
    t.string "cut", default: "normal", null: false
    t.integer "unit_cost_cents"
    t.index ["product_id", "cut"], name: "index_product_variants_on_product_id_and_cut"
    t.index ["product_id", "gender"], name: "index_product_variants_on_product_id_and_gender"
    t.index ["product_id"], name: "index_product_variants_on_product_id"
    t.index ["sku"], name: "index_product_variants_on_sku", unique: true
    t.index ["stock_quantity"], name: "index_product_variants_on_stock_quantity"
    t.check_constraint "compare_at_price_cents IS NULL OR compare_at_price_cents >= 0", name: "chk_product_variants_compare_at_price_cents_non_negative"
    t.check_constraint "price_cents >= 0", name: "chk_product_variants_price_cents_non_negative"
  end

  create_table "products", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.integer "price_cents", null: false
    t.string "category"
    t.string "slug", null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "image_order", default: [], null: false
    t.integer "weight_g"
    t.integer "height_mm"
    t.integer "width_mm"
    t.integer "length_mm"
    t.integer "fulfillment_mode", default: 0, null: false
    t.integer "production_lead_time_days"
    t.integer "production_capacity"
    t.integer "cancellation_refund_percentage"
    t.integer "compare_at_price_cents"
    t.integer "unit_cost_cents"
    t.index ["active"], name: "index_products_on_active"
    t.index ["fulfillment_mode"], name: "index_products_on_fulfillment_mode"
    t.index ["slug"], name: "index_products_on_slug", unique: true
    t.check_constraint "compare_at_price_cents IS NULL OR compare_at_price_cents >= 0", name: "chk_products_compare_at_price_cents_non_negative"
    t.check_constraint "height_mm IS NULL OR height_mm > 0", name: "chk_products_height_mm_positive"
    t.check_constraint "length_mm IS NULL OR length_mm > 0", name: "chk_products_length_mm_positive"
    t.check_constraint "weight_g IS NULL OR weight_g > 0", name: "chk_products_weight_g_positive"
    t.check_constraint "width_mm IS NULL OR width_mm > 0", name: "chk_products_width_mm_positive"
  end

  create_table "release_executions", force: :cascade do |t|
    t.bigint "user_id"
    t.string "ip_address"
    t.integer "orders_deleted", default: 0, null: false
    t.integer "order_items_deleted", default: 0, null: false
    t.integer "customers_deleted", default: 0, null: false
    t.datetime "executed_at", null: false
    t.index ["executed_at"], name: "index_release_executions_on_executed_at", order: :desc
    t.index ["user_id"], name: "index_release_executions_on_user_id"
  end

  create_table "shipping_carriers", force: :cascade do |t|
    t.integer "me_service_id", null: false
    t.string "name", null: false
    t.string "company", null: false
    t.boolean "enabled", default: true, null: false
    t.integer "extra_days", default: 0, null: false
    t.integer "extra_margin_pct", default: 0, null: false
    t.integer "min_value_cents", default: 0, null: false
    t.integer "max_value_cents"
    t.integer "free_above_cents"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["enabled"], name: "index_shipping_carriers_on_enabled"
    t.index ["me_service_id"], name: "index_shipping_carriers_on_me_service_id", unique: true
  end

  create_table "shipping_settings", force: :cascade do |t|
    t.string "origin_zipcode", default: "", null: false
    t.string "sender_name", default: "", null: false
    t.string "sender_phone", default: "", null: false
    t.string "sender_address", default: "", null: false
    t.string "sender_number", default: "", null: false
    t.string "sender_city", default: "", null: false
    t.string "sender_state", default: "", null: false
    t.string "me_client_id", default: "", null: false
    t.text "me_client_secret"
    t.text "me_access_token"
    t.text "me_refresh_token"
    t.boolean "me_sandbox", default: true, null: false
    t.boolean "free_shipping_enabled", default: false, null: false
    t.integer "free_shipping_above_cents", default: 0, null: false
    t.boolean "local_pickup_enabled", default: false, null: false
    t.integer "global_extra_days", default: 0, null: false
    t.integer "global_extra_margin_pct", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "store_settings", force: :cascade do |t|
    t.string "event_name", default: "Festa de Andrequicé", null: false
    t.string "edition", default: "2025", null: false
    t.string "contact_email", default: "", null: false
    t.text "pickup_address", default: "", null: false
    t.string "whatsapp_number", default: "", null: false
    t.integer "free_shipping_above_cents", default: 15000, null: false
    t.integer "shipping_fee_cents", default: 1500, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "pickup_zipcode", default: "", null: false
    t.string "pickup_street", default: "", null: false
    t.string "pickup_number", default: "", null: false
    t.string "pickup_complement", default: "", null: false
    t.string "pickup_city", default: "", null: false
    t.string "pickup_state", default: "", null: false
    t.string "headline_primary", default: "Nossa história,", null: false
    t.string "headline_secondary", default: "nossa devoção.", null: false
    t.text "headline_description", default: "Camisetas artesanais da Festa de Andrequicé. Arte, fé e tradição em cada peça.", null: false
    t.text "footer_description", default: "Camisetas artesanais da Festa de Andrequicé — fé, tradição e arte do interior de Minas Gerais.", null: false
    t.boolean "pickup_enabled", default: true, null: false
  end

  create_table "stripe_mode_changes", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "previous_mode", null: false
    t.string "new_mode", null: false
    t.string "ip_address"
    t.datetime "created_at", null: false
    t.index ["created_at"], name: "index_stripe_mode_changes_on_created_at", order: :desc
    t.index ["user_id"], name: "index_stripe_mode_changes_on_user_id"
  end

  create_table "stripe_settings", force: :cascade do |t|
    t.string "active_mode", default: "test", null: false
    t.text "test_publishable_key"
    t.text "test_secret_key"
    t.text "test_webhook_secret"
    t.text "live_publishable_key"
    t.text "live_secret_key"
    t.text "live_webhook_secret"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "role", default: "admin", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["role"], name: "index_users_on_role"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "coupon_codes", "coupons"
  add_foreign_key "coupon_products", "coupons"
  add_foreign_key "coupon_products", "products"
  add_foreign_key "coupon_usages", "coupon_codes"
  add_foreign_key "coupon_usages", "coupons"
  add_foreign_key "coupon_usages", "orders"
  add_foreign_key "customer_addresses", "customers"
  add_foreign_key "onboarding_progresses", "store_settings", on_delete: :cascade
  add_foreign_key "onboarding_progresses", "users", on_delete: :cascade
  add_foreign_key "order_items", "orders"
  add_foreign_key "order_items", "product_variants"
  add_foreign_key "order_items", "products"
  add_foreign_key "order_status_histories", "orders"
  add_foreign_key "orders", "coupons"
  add_foreign_key "orders", "customers"
  add_foreign_key "product_variants", "products"
  add_foreign_key "release_executions", "users"
  add_foreign_key "stripe_mode_changes", "users"
end
