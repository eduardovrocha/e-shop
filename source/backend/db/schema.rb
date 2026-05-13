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

ActiveRecord::Schema[7.2].define(version: 2026_05_13_170001) do
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

  create_table "coupons", force: :cascade do |t|
    t.string "code", null: false
    t.string "discount_type", null: false
    t.decimal "discount_value", precision: 10, scale: 2, null: false
    t.integer "minimum_order_cents"
    t.datetime "expires_at"
    t.integer "usage_limit"
    t.integer "used_count", default: 0, null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_coupons_on_code", unique: true
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
    t.index ["created_at"], name: "index_orders_on_created_at"
    t.index ["customer_email"], name: "index_orders_on_customer_email"
    t.index ["customer_id"], name: "index_orders_on_customer_id"
    t.index ["number"], name: "index_orders_on_number", unique: true, where: "(number IS NOT NULL)"
    t.index ["status"], name: "index_orders_on_status"
    t.index ["stripe_intent_id"], name: "index_orders_on_stripe_intent_id", unique: true
    t.index ["tracking_token"], name: "index_orders_on_tracking_token", unique: true
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
    t.index ["product_id"], name: "index_product_variants_on_product_id"
    t.index ["sku"], name: "index_product_variants_on_sku", unique: true
    t.index ["stock_quantity"], name: "index_product_variants_on_stock_quantity"
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
    t.index ["active"], name: "index_products_on_active"
    t.index ["slug"], name: "index_products_on_slug", unique: true
    t.check_constraint "height_mm IS NULL OR height_mm > 0", name: "chk_products_height_mm_positive"
    t.check_constraint "length_mm IS NULL OR length_mm > 0", name: "chk_products_length_mm_positive"
    t.check_constraint "weight_g IS NULL OR weight_g > 0", name: "chk_products_weight_g_positive"
    t.check_constraint "width_mm IS NULL OR width_mm > 0", name: "chk_products_width_mm_positive"
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
  add_foreign_key "customer_addresses", "customers"
  add_foreign_key "order_status_histories", "orders"
  add_foreign_key "orders", "customers"
  add_foreign_key "product_variants", "products"
end
