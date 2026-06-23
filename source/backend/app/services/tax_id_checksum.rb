# Validação local de CPF/CNPJ. Sem chamada externa.
#
# Recebe SEMPRE só dígitos. Quem normaliza (strip de máscara) é o caller —
# por convenção, o `before_validation` do Order, que escreve em `tax_id`
# apenas a versão crua de 11 ou 14 dígitos.
#
# Regras:
#   • 11 dígitos → valida como CPF (módulo 11, dois dígitos verificadores).
#   • 14 dígitos → valida como CNPJ (módulo 11, dois dígitos verificadores,
#     pesos 5-4-3-2-9-8-7-6-5-4-3-2 e 6-5-4-3-2-9-8-7-6-5-4-3-2).
#   • Sequências triviais (todos os dígitos iguais) são rejeitadas
#     explicitamente porque passariam no módulo 11 (00000000000,
#     11111111111, …) e são marcadores conhecidos de input falso.
#
# Porte TS espelhado em frontend/src/lib/taxId.ts e dashboard/src/lib/taxId.ts.
# Mantenha os três sincronizados — qualquer mudança nas regras tem que sair
# em todos os pontos juntos.
module TaxIdChecksum
  module_function

  def valid?(digits)
    return false unless digits.is_a?(String)
    return false if digits.match?(/\A(\d)\1+\z/)

    case digits.length
    when 11 then cpf_valid?(digits)
    when 14 then cnpj_valid?(digits)
    else         false
    end
  end

  def cpf_valid?(digits)
    nums = digits.chars.map(&:to_i)
    d1 = mod11_check(nums.first(9), (2..10).to_a.reverse)
    d2 = mod11_check(nums.first(10), (2..11).to_a.reverse)
    nums[9] == d1 && nums[10] == d2
  end

  def cnpj_valid?(digits)
    nums    = digits.chars.map(&:to_i)
    weights_d1 = [ 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 ]
    weights_d2 = [ 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 ]
    d1 = mod11_check(nums.first(12), weights_d1)
    d2 = mod11_check(nums.first(13), weights_d2)
    nums[12] == d1 && nums[13] == d2
  end

  # Algoritmo padrão Receita Federal: soma * pesos, mod 11, < 2 → 0,
  # caso contrário 11 - resto.
  def mod11_check(nums, weights)
    sum = nums.each_with_index.sum { |n, i| n * weights[i] }
    rest = sum % 11
    rest < 2 ? 0 : 11 - rest
  end
end
