// Porta TS do backend `TaxIdChecksum`. Qualquer mudança aqui deve sair
// junto em `frontend/src/lib/taxId.ts` e `backend/app/services/tax_id_checksum.rb`.

export type TaxIdKind = 'cpf' | 'cnpj'

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function inferTaxIdKind(digits: string): TaxIdKind | null {
  if (digits.length === 11) return 'cpf'
  if (digits.length === 14) return 'cnpj'
  return null
}

// Máscara progressiva: até 11 dígitos formata como CPF; 12+ vira CNPJ.
// Limita a 14 dígitos.
export function formatTaxId(value: string): string {
  const d = digitsOnly(value).slice(0, 14)
  if (d.length <= 11) {
    if (d.length <= 3)  return d
    if (d.length <= 6)  return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9)  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  if (d.length <= 5)  return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function mod11Check(nums: number[], weights: number[]): number {
  const sum = nums.reduce((acc, n, i) => acc + n * weights[i], 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

function isCpfValid(digits: string): boolean {
  const nums = digits.split('').map((c) => parseInt(c, 10))
  const w1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
  return nums[9] === mod11Check(nums.slice(0, 9), w1) && nums[10] === mod11Check(nums.slice(0, 10), w2)
}

function isCnpjValid(digits: string): boolean {
  const nums = digits.split('').map((c) => parseInt(c, 10))
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return nums[12] === mod11Check(nums.slice(0, 12), w1) && nums[13] === mod11Check(nums.slice(0, 13), w2)
}

export function isTaxIdValid(input: string): boolean {
  const d = digitsOnly(input)
  if (/^(\d)\1+$/.test(d)) return false
  if (d.length === 11) return isCpfValid(d)
  if (d.length === 14) return isCnpjValid(d)
  return false
}

export function taxIdErrorMessage(digits: string): string | null {
  if (digits.length === 0) return 'Informe CPF ou CNPJ'
  if (digits.length < 11) return 'CPF inválido'
  if (digits.length === 11) return isCpfValid(digits) && !/^(\d)\1+$/.test(digits) ? null : 'CPF inválido'
  if (digits.length < 14) return 'CNPJ inválido'
  if (digits.length === 14) return isCnpjValid(digits) && !/^(\d)\1+$/.test(digits) ? null : 'CNPJ inválido'
  return 'CNPJ inválido'
}
