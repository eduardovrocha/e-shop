class CustomerUpsertService
  PAID_STATUSES = %w[paid processing producing packed shipped out_for_delivery delivered].freeze

  def self.call(order)
    return unless order.customer_email.present?

    customer = nil
    ActiveRecord::Base.transaction do
      customer = upsert_customer(order)
      order.update_column(:customer_id, customer.id) if order.customer_id != customer.id
      upsert_address(customer, order.shipping_address) if delivery_with_address?(order)
    end
    customer
  rescue => e
    Rails.logger.error "[CustomerUpsert] Error for order #{order.id}: #{e.message}"
    nil
  end

  # Backfill all paid orders that have no customer_id yet
  def self.backfill_all
    Order.where(status: PAID_STATUSES, customer_id: nil)
         .where.not(customer_email: [ nil, "" ])
         .find_each { |o| call(o) }
  end

  private

  def self.upsert_customer(order)
    email = order.customer_email.strip.downcase
    customer = Customer.find_or_initialize_by(email: email)
    customer.name  = order.customer_name  if order.customer_name.present?
    customer.phone = order.customer_phone if order.customer_phone.present? && customer.phone.blank?
    customer.save!
    customer
  end

  def self.delivery_with_address?(order)
    order.delivery_method == "delivery" && order.shipping_address.present?
  end

  def self.upsert_address(customer, addr)
    zipcode = addr["cep"].to_s.gsub(/\D/, "")
    street  = addr["address"].to_s.strip

    address = customer.addresses.find_or_initialize_by(zipcode: zipcode, street: street)
    address.assign_attributes(
      number:       addr["number"].to_s.strip,
      complement:   addr["complement"].to_s.strip,
      neighborhood: addr["neighborhood"].to_s.strip,
      city:         addr["city"].to_s.strip,
      state:        addr["state"].to_s.strip.upcase,
      country:      "BR",
    )
    address.is_default = customer.addresses.where(is_default: true).none? if address.new_record?
    address.save!
  end
end
