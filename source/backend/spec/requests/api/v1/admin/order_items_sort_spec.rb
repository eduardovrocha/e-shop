require "rails_helper"

# Coverage for the admin OrderItems#index sort logic introduced for the
# production queue visual ordering. The production state machine and queue
# advancement are NOT exercised here — they keep their FIFO discipline
# regardless of these visual sorts.
#
# The test DB carries residue from other specs / dev seeds, so we filter
# the controller response down to only the items this spec created and
# preserve the relative order returned by the controller.
RSpec.describe "Admin OrderItems sort", type: :request do
  let!(:admin) { create(:user, email: "admin@example.com", password: "Password123!", role: "admin") }
  let(:headers) { { "Authorization" => "Bearer #{JwtService.encode(user_id: admin.id)}" } }

  let!(:product_a) { create(:product, :made_to_order, name: "AAA Camiseta") }
  let!(:product_b) { create(:product, :made_to_order, name: "BBB Camiseta") }
  let!(:product_c) { create(:product, :made_to_order, name: "CCC Camiseta") }

  let!(:variant_a) { create(:product_variant, product: product_a) }
  let!(:variant_b) { create(:product_variant, product: product_b) }
  let!(:variant_c) { create(:product_variant, product: product_c) }

  let!(:order_old)    { create(:order, status: "paid", customer_name: "Bruno",  created_at: 3.days.ago) }
  let!(:order_middle) { create(:order, status: "paid", customer_name: "Carlos", created_at: 2.days.ago) }
  let!(:order_new)    { create(:order, status: "paid", customer_name: "Ana",    created_at: 1.day.ago) }

  let!(:item_old) do
    create(:order_item,
      order: order_old, product_variant: variant_b, product: product_b,
      production_status: :paid, promised_completion_date: 10.days.from_now.to_date,
      created_at: 3.days.ago)
  end
  let!(:item_middle) do
    create(:order_item,
      order: order_middle, product_variant: variant_c, product: product_c,
      production_status: :paid, promised_completion_date: 2.days.from_now.to_date,
      created_at: 2.days.ago)
  end
  let!(:item_new) do
    create(:order_item,
      order: order_new, product_variant: variant_a, product: product_a,
      production_status: :paid, promised_completion_date: 20.days.from_now.to_date,
      created_at: 1.day.ago)
  end

  def get_index(sort: nil)
    params = { production_status: "paid", per_page: 500 }
    params[:sort] = sort unless sort.nil?
    get "/api/v1/admin/order_items", params: params, headers: headers
  end

  # Filter the response to only the IDs we care about (test isolation against
  # data residue in the shared dev test DB).
  def relative_order(scoped_ids)
    response.parsed_body["order_items"].map { |i| i["id"] } & scoped_ids
  end

  let(:scoped_ids) { [item_old.id, item_middle.id, item_new.id] }

  describe "created_at_asc (FIFO, default)" do
    it "returns oldest first" do
      get_index(sort: "created_at_asc")
      expect(response).to have_http_status(:ok)
      expect(relative_order(scoped_ids)).to eq([item_old.id, item_middle.id, item_new.id])
    end
  end

  describe "created_at_desc" do
    it "returns newest first" do
      get_index(sort: "created_at_desc")
      expect(relative_order(scoped_ids)).to eq([item_new.id, item_middle.id, item_old.id])
    end
  end

  describe "promised_completion_date_asc" do
    it "returns the item with the closest deadline first" do
      get_index(sort: "promised_completion_date_asc")
      # middle (2d) < old (10d) < new (20d)
      expect(relative_order(scoped_ids)).to eq([item_middle.id, item_old.id, item_new.id])
    end
  end

  describe "customer_name_asc" do
    it "returns items ordered alphabetically by order.customer_name" do
      get_index(sort: "customer_name_asc")
      # Ana → Bruno → Carlos
      expect(relative_order(scoped_ids)).to eq([item_new.id, item_old.id, item_middle.id])
    end
  end

  describe "product_name_asc" do
    it "returns items ordered alphabetically by product name" do
      get_index(sort: "product_name_asc")
      # AAA (item_new) → BBB (item_old) → CCC (item_middle)
      expect(relative_order(scoped_ids)).to eq([item_new.id, item_old.id, item_middle.id])
    end
  end

  describe "invalid sort" do
    it "falls back silently to FIFO without 5xx" do
      get_index(sort: "nope_doesnt_exist")
      expect(response).to have_http_status(:ok)
      expect(relative_order(scoped_ids)).to eq([item_old.id, item_middle.id, item_new.id])
    end

    it "treats missing sort param as FIFO" do
      get_index(sort: nil)
      expect(relative_order(scoped_ids)).to eq([item_old.id, item_middle.id, item_new.id])
    end
  end

  describe "tiebreaker on created_at + id" do
    let(:tied_at) { 5.minutes.ago }
    let!(:tied_order_1) { create(:order, status: "paid", customer_name: "Ana", created_at: tied_at) }
    let!(:tied_order_2) { create(:order, status: "paid", customer_name: "Ana", created_at: tied_at) }
    let!(:tied_item_1) do
      create(:order_item,
        order: tied_order_1, product_variant: variant_a, product: product_a,
        production_status: :paid, promised_completion_date: 2.days.from_now.to_date,
        created_at: tied_at)
    end
    let!(:tied_item_2) do
      create(:order_item,
        order: tied_order_2, product_variant: variant_a, product: product_a,
        production_status: :paid, promised_completion_date: 2.days.from_now.to_date,
        created_at: tied_at)
    end

    it "uses id as deterministic tiebreaker when promised dates are equal" do
      get_index(sort: "promised_completion_date_asc")
      tied = relative_order([tied_item_1.id, tied_item_2.id])
      expect(tied).to eq([tied_item_1.id, tied_item_2.id])
    end
  end

  describe "joins do not duplicate rows in the page" do
    it "returns each scoped item exactly once when joining orders (customer_name sort)" do
      get_index(sort: "customer_name_asc")
      ids = response.parsed_body["order_items"].map { |i| i["id"] }
      expect(ids.count(item_old.id)).to    eq(1)
      expect(ids.count(item_middle.id)).to eq(1)
      expect(ids.count(item_new.id)).to    eq(1)
    end

    it "returns each scoped item exactly once when joining products (product_name sort)" do
      get_index(sort: "product_name_asc")
      ids = response.parsed_body["order_items"].map { |i| i["id"] }
      expect(ids.count(item_old.id)).to    eq(1)
      expect(ids.count(item_middle.id)).to eq(1)
      expect(ids.count(item_new.id)).to    eq(1)
    end
  end
end
