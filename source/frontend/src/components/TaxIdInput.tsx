import { useEffect } from 'react'
import { Input } from '@/components/Input'
import { digitsOnly, formatTaxId, taxIdErrorMessage } from '@/lib/taxId'

interface TaxIdInputProps {
  // Sempre armazena dígitos crus no estado pai. A máscara é aplicada apenas
  // na renderização, evitando que estados intermediários carreguem máscara
  // (e bagunçando split, persistência etc.).
  value: string
  onChange: (digits: string) => void
  onValidChange?: (valid: boolean) => void
  error?: string
  disabled?: boolean
  label?: string
  hint?: string
  required?: boolean
}

export function TaxIdInput({
  value,
  onChange,
  onValidChange,
  error,
  disabled,
  label = 'CPF ou CNPJ',
  hint,
  required = true,
}: TaxIdInputProps) {
  const digits = digitsOnly(value)
  const localError = taxIdErrorMessage(digits)
  // Só mostra erro depois do usuário digitar algo. Antes de qualquer input,
  // mantém o campo limpo (sem texto vermelho).
  const visibleError = error ?? (digits.length === 0 ? undefined : localError ?? undefined)

  useEffect(() => {
    onValidChange?.(localError === null)
  }, [localError, onValidChange])

  return (
    <Input
      label={label}
      value={formatTaxId(digits)}
      onChange={(masked) => onChange(digitsOnly(masked))}
      type="text"
      inputMode="numeric"
      placeholder="000.000.000-00 ou 00.000.000/0000-00"
      maxLength={18}
      error={visibleError}
      hint={hint}
      disabled={disabled}
      required={required}
    />
  )
}
