class SeedDefaultCategories < ActiveRecord::Migration[7.1]
  DEFAULTS = %w[camisetas acessorios kits outros].freeze

  def up
    DEFAULTS.each_with_index do |name, pos|
      execute <<~SQL
        INSERT INTO categories (name, position, created_at, updated_at)
        VALUES ('#{name}', #{pos}, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING
      SQL
    end
  end

  def down
    names = DEFAULTS.map { |n| "'#{n}'" }.join(', ')
    execute "DELETE FROM categories WHERE name IN (#{names})"
  end
end
