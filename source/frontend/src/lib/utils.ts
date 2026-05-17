export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return digits
}

// Re-mask a Brazilian phone number that may arrive already masked, with
// stray characters, or with the dial code. Returns "(XX) XXXX-XXXX" for
// 10 digits and "(XX) XXXXX-XXXX" for 11. Anything shorter is returned
// digit-only to avoid producing partial-looking masks in summaries.
export function formatPhoneBR(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0)  return ''
  if (d.length <= 2)   return d
  if (d.length <= 6)   return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
