if Rails.env.production? && ENV["ADMIN_SEED_PASSWORD"].blank?
  raise "ADMIN_SEED_PASSWORD é obrigatória em produção. " \
        "Defina no .env antes de rodar db:seed."
end

# Admin user
User.find_or_create_by!(email: "admin@andrequice.store") do |u|
  u.name     = "Admin"
  u.password = ENV.fetch("ADMIN_SEED_PASSWORD", "admin123")
  u.role     = "admin"
end
puts "Admin criado: admin@andrequice.store"

# Sample products
[
  { name: "Camiseta Clássica Andrequicé", price_cents: 8990, category: "camisetas", slug: "camiseta-classica-andrequice" },
  { name: "Camiseta Sagrado Coração",     price_cents: 9990, category: "camisetas", slug: "camiseta-sagrado-coracao" },
  { name: "Camiseta Devoção 2025",        price_cents: 10990, category: "camisetas", slug: "camiseta-devocao-2025" },
  { name: "Camiseta Romaria",             price_cents: 7990, category: "camisetas", slug: "camiseta-romaria" }
].each do |attrs|
  p = Product.find_or_create_by!(slug: attrs[:slug]) do |prod|
    prod.name        = attrs[:name]
    prod.price_cents = attrs[:price_cents]
    prod.category    = attrs[:category]
    prod.active      = true
    prod.images      = []
    prod.weight_g    = 300
    prod.height_mm   = 40
    prod.width_mm    = 200
    prod.length_mm   = 300
  end
  %w[P M G GG].each_with_index do |size, i|
    ProductVariant.find_or_create_by!(sku: "#{attrs[:slug].upcase[0..5]}-#{size}") do |v|
      v.product        = p
      v.size           = size
      v.stock_quantity = [ 12, 8, 15, 5 ][i]
      v.price_cents    = attrs[:price_cents]
    end
  end
end
puts "Produtos criados."

# Shipping carriers (Melhor Envio service IDs)
shipping_carriers = [
  { me_service_id: 1,  name: "PAC",         company: "Correios" },
  { me_service_id: 2,  name: "SEDEX",        company: "Correios" },
  { me_service_id: 3,  name: "SEDEX 12",     company: "Correios" },
  { me_service_id: 4,  name: "SEDEX 10",     company: "Correios" },
  { me_service_id: 7,  name: ".Package",     company: "Jadlog" },
  { me_service_id: 8,  name: ".Com",         company: "Jadlog" },
  { me_service_id: 9,  name: "Mini Envios",  company: "Correios" },
  { me_service_id: 15, name: "Expresso",     company: "Azul Cargo" },
  { me_service_id: 16, name: "Amanhã",       company: "Azul Cargo" },
  { me_service_id: 17, name: "Cargo",        company: "LATAM Cargo" },
  { me_service_id: 20, name: "Expresso",     company: "Loggi" }
]
shipping_carriers.each do |attrs|
  ShippingCarrier.find_or_create_by!(me_service_id: attrs[:me_service_id]) do |c|
    c.name    = attrs[:name]
    c.company = attrs[:company]
  end
end
puts "Transportadoras criadas: #{ShippingCarrier.count}"
