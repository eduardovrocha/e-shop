import { useEffect, useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { digitsOnly, formatTaxId, taxIdErrorMessage } from '@/lib/taxId'

interface TaxIdInputProps {
  // Sempre armazena dígitos crus no estado pai. A máscara é só presentation.
  value: string
  onChange: (digits: string) => void
  onValidChange?: (valid: boolean) => void
  error?: string
  disabled?: boolean
  label?: string
  id?: string
  required?: boolean
}

export function TaxIdInput({
  value,
  onChange,
  onValidChange,
  error,
  disabled,
  label = 'CPF ou CNPJ',
  id,
  required,
}: TaxIdInputProps) {
  const auto = useId()
  const inputId = id ?? auto
  const digits = digitsOnly(value)
  const localError = taxIdErrorMessage(digits)
  const visibleError = error ?? (digits.length === 0 ? undefined : localError ?? undefined)

  useEffect(() => {
    onValidChange?.(localError === null)
  }, [localError, onValidChange])

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={inputId}
        inputMode="numeric"
        placeholder="000.000.000-00 ou 00.000.000/0000-00"
        maxLength={18}
        disabled={disabled}
        value={formatTaxId(digits)}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        aria-invalid={visibleError ? true : undefined}
        className={visibleError ? 'border-destructive focus-visible:ring-destructive' : undefined}
      />
      {visibleError && <p className="text-xs text-destructive">{visibleError}</p>}
    </div>
  )
}
