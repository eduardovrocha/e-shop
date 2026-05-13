module Api
  module V1
    module Admin
      class CustomersController < BaseController
        PER_PAGE = 20

        def index
          scope = Customer.all
          if params[:search].present?
            q = "%#{params[:search]}%"
            scope = scope.where("email ILIKE ? OR name ILIKE ? OR phone ILIKE ?", q, q, q)
          end
          scope = scope.order(created_at: :desc).page(params[:page]).per(PER_PAGE)

          ids = scope.map(&:id)
          stats = Order.where(customer_id: ids)
                       .group(:customer_id)
                       .select("customer_id, COUNT(*) as orders_count, SUM(total_cents) as total_spent_cents, MAX(created_at) as last_order_at")
                       .index_by(&:customer_id)

          render json: {
            customers: scope.map { |c| customer_summary(c, stats[c.id]) },
            meta: {
              current_page:  scope.current_page,
              total_pages:   scope.total_pages,
              total_count:   scope.total_count,
            },
          }
        end

        def show
          customer = Customer.find(params[:id])
          orders   = customer.orders.order(created_at: :desc).limit(20)

          render json: {
            id:                customer.id,
            name:              customer.name,
            email:             customer.email,
            phone:             customer.phone,
            created_at:        customer.created_at,
            orders_count:      customer.orders.count,
            total_spent_cents: customer.orders.sum(:total_cents),
            last_order_at:     customer.orders.maximum(:created_at),
            addresses:         customer.addresses.map { |a| address_json(a) },
            orders:            orders.map { |o| order_summary(o) },
          }
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Cliente não encontrado" }, status: :not_found
        end

        private

        def customer_summary(customer, stat = nil)
          {
            id:                customer.id,
            name:              customer.name,
            email:             customer.email,
            phone:             customer.phone,
            orders_count:      stat&.orders_count.to_i,
            total_spent_cents: stat&.total_spent_cents.to_i,
            last_order_at:     stat&.last_order_at,
          }
        end

        def address_json(addr)
          {
            id:           addr.id,
            zipcode:      addr.zipcode,
            street:       addr.street,
            number:       addr.number,
            complement:   addr.complement,
            neighborhood: addr.neighborhood,
            city:         addr.city,
            state:        addr.state,
            country:      addr.country,
            is_default:   addr.is_default,
          }
        end

        def order_summary(order)
          {
            id:          order.id,
            number:      order.number,
            status:      order.status,
            total_cents: order.total_cents,
            created_at:  order.created_at,
          }
        end
      end
    end
  end
end
