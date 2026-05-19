import { formatInstallmentLabel, type InstallmentCount } from '@/utils/installments'

interface InstallmentSelectorProps {
  totalCents: number
  value: InstallmentCount
  onChange: (count: InstallmentCount) => void
  disabled?: boolean
}

const COUNTS: InstallmentCount[] = [1, 2, 3]

export function InstallmentSelector({
  totalCents,
  value,
  onChange,
  disabled,
}: InstallmentSelectorProps) {
  return (
    <fieldset className="mb-4" disabled={disabled} aria-label="Parcelamento">
      <legend className="font-sans text-sm font-medium text-andrequice-navy mb-2">
        Parcelamento
      </legend>
      <div className="flex flex-col gap-2">
        {COUNTS.map((count) => {
          const selected = value === count
          return (
            <label
              key={count}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors',
                selected
                  ? 'border-andrequice-gold bg-andrequice-gold/5'
                  : 'border-andrequice-sand bg-white hover:border-andrequice-gold/60',
                disabled ? 'opacity-60 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name="installmentCount"
                value={count}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(count)}
                className="accent-andrequice-gold"
              />
              <span className="text-sm text-andrequice-navy">
                {formatInstallmentLabel(totalCents, count)}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
