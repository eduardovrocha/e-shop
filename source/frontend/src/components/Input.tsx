import { type KeyboardEventHandler } from 'react'
import { cn } from '@/lib/utils'

interface InputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'tel' | 'number'
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  className?: string
  inputMode?: 'text' | 'email' | 'tel' | 'numeric'
  maxLength?: number
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  hint,
  required = false,
  disabled = false,
  className,
  inputMode,
  maxLength,
  onKeyDown,
}: InputProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-andrequice-brown">
          {label}
          {required && <span className="text-andrequice-copper ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-white border text-andrequice-brown placeholder:text-andrequice-border',
          'text-base font-sans transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-andrequice-gold focus:border-andrequice-gold',
          error
            ? 'border-andrequice-copper'
            : 'border-andrequice-border hover:border-andrequice-gold/60',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      {error && <p className="text-xs text-andrequice-copper">{error}</p>}
      {hint && !error && <p className="text-xs text-andrequice-border">{hint}</p>}
    </div>
  )
}
