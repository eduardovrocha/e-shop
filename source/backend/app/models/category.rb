class Category < ApplicationRecord
  validates :name, presence: true, uniqueness: { case_sensitive: false }

  default_scope { order(:position, :name) }

  def products_count
    Product.where(category: name).count
  end
end
