import { useMemo } from 'react'
import type {
  FulfillmentMode,
  VariantStock,
  VariantGender,
  VariantCut,
} from '@/types/product'
import {
  VARIANT_GENDER_LABEL,
  VARIANT_CUT_LABEL,
} from '@/types/product'
import { isVariantPurchasable } from '@/utils/variant'

// Multi-dimension picker: a single product may carry several variants
// distinguished by (gender, cut, size). The user picks each dimension in
// sequence — chips disable when no remaining variant matches the current
// selection. The "selected variant" only exists when all three dimensions
// converge on exactly one row.

interface VariantPickerProps {
  variants: VariantStock[]
  selectedId: number | null
  onSelect: (variant: VariantStock | null) => void
  fulfillmentMode?: FulfillmentMode
  // Highlight in copper when the parent reports a "please select" error.
  errorState?: boolean
  // Caller-controlled state for the partial picks (gender + cut). Lifted
  // because the parent (Product page) also resets them between products.
  selectedGender: VariantGender | null
  selectedCut:    VariantCut    | null
  onChangeGender: (g: VariantGender | null) => void
  onChangeCut:    (c: VariantCut    | null) => void
}

const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'GGG', 'XGG', 'U'] as const
const sortBySize = (a: VariantStock, b: VariantStock): number => {
  const ai = SIZE_ORDER.indexOf(a.size as typeof SIZE_ORDER[number])
  const bi = SIZE_ORDER.indexOf(b.size as typeof SIZE_ORDER[number])
  if (ai === -1 && bi === -1) return a.size.localeCompare(b.size)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}

// Stable order for the chip rows so the UI doesn't shuffle as variants
// come/go between products.
const GENDER_ORDER: VariantGender[] = ['unissex', 'masculino', 'feminino']
const CUT_ORDER: VariantCut[] = ['normal', 'babylook', 'polo', 'regata', 'oversized']

export function VariantPicker({
  variants,
  selectedId,
  onSelect,
  fulfillmentMode = 'from_stock',
  errorState,
  selectedGender,
  selectedCut,
  onChangeGender,
  onChangeCut,
}: VariantPickerProps) {
  const product = { fulfillmentMode }

  // Distinct values present in this product's variant catalog. We only
  // render rows for genders/cuts that actually have at least one variant —
  // showing "Polo" when no polo exists would just frustrate the buyer.
  const availableGenders = useMemo(
    () => GENDER_ORDER.filter((g) => variants.some((v) => v.gender === g)),
    [variants],
  )
  const availableCuts = useMemo(
    () => CUT_ORDER.filter((c) => variants.some((v) => v.cut === c)),
    [variants],
  )

  // Variants matching the partial selection so far. Size chips below
  // are derived from this filtered set.
  const matchingForSize = useMemo(() => {
    return variants.filter(
      (v) =>
        (selectedGender == null || v.gender === selectedGender) &&
        (selectedCut    == null || v.cut    === selectedCut),
    )
  }, [variants, selectedGender, selectedCut])

  const sortedSizes = useMemo(() => [...matchingForSize].sort(sortBySize), [matchingForSize])

  // Helpers for chip enablement of gender/cut rows. A chip is enabled
  // when at least one purchasable variant exists for that option given
  // the other dimension's current pick.
  function hasPurchasableForGender(g: VariantGender): boolean {
    return variants.some(
      (v) =>
        v.gender === g &&
        (selectedCut == null || v.cut === selectedCut) &&
        isVariantPurchasable(product, v),
    )
  }
  function hasPurchasableForCut(c: VariantCut): boolean {
    return variants.some(
      (v) =>
        v.cut === c &&
        (selectedGender == null || v.gender === selectedGender) &&
        isVariantPurchasable(product, v),
    )
  }

  function handleGenderClick(g: VariantGender) {
    const next = selectedGender === g ? null : g
    onChangeGender(next)
    // Reset the active variant if the new gender filter excludes it.
    if (selectedId != null) {
      const stillValid = variants.some(
        (v) =>
          v.variantId === selectedId &&
          (next == null || v.gender === next) &&
          (selectedCut == null || v.cut === selectedCut),
      )
      if (!stillValid) onSelect(null)
    }
  }
  function handleCutClick(c: VariantCut) {
    const next = selectedCut === c ? null : c
    onChangeCut(next)
    if (selectedId != null) {
      const stillValid = variants.some(
        (v) =>
          v.variantId === selectedId &&
          (selectedGender == null || v.gender === selectedGender) &&
          (next == null || v.cut === next),
      )
      if (!stillValid) onSelect(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Gender row */}
      {availableGenders.length > 1 && (
        <ChipRow
          label="Gênero"
          selectedLabel={selectedGender ? VARIANT_GENDER_LABEL[selectedGender] : '—'}
          ariaLabel="Gênero"
        >
          {availableGenders.map((g) => {
            const enabled  = hasPurchasableForGender(g)
            const selected = selectedGender === g
            return (
              <Chip
                key={g}
                role="checkbox"
                ariaChecked={selected}
                disabled={!enabled}
                selected={selected}
                errorState={errorState}
                onClick={() => enabled && handleGenderClick(g)}
              >
                {VARIANT_GENDER_LABEL[g]}
              </Chip>
            )
          })}
        </ChipRow>
      )}

      {/* Cut row */}
      {availableCuts.length > 1 && (
        <ChipRow
          label="Modelo"
          selectedLabel={selectedCut ? VARIANT_CUT_LABEL[selectedCut] : '—'}
          ariaLabel="Modelo / corte"
        >
          {availableCuts.map((c) => {
            const enabled  = hasPurchasableForCut(c)
            const selected = selectedCut === c
            return (
              <Chip
                key={c}
                role="checkbox"
                ariaChecked={selected}
                disabled={!enabled}
                selected={selected}
                errorState={errorState}
                onClick={() => enabled && handleCutClick(c)}
              >
                {VARIANT_CUT_LABEL[c]}
              </Chip>
            )
          })}
        </ChipRow>
      )}

      {/* Size row */}
      <ChipRow
        label="Tamanho"
        selectedLabel={
          selectedId != null
            ? variants.find((v) => v.variantId === selectedId)?.size ?? '—'
            : '—'
        }
        ariaLabel="Tamanho"
      >
        {sortedSizes.length === 0 ? (
          <span className="text-xs text-andrequice-brown/50 py-2">
            Nenhuma combinação disponível com a seleção atual.
          </span>
        ) : (
          sortedSizes.map((v) => {
            const purchasable = isVariantPurchasable(product, v)
            const isSelected  = v.variantId === selectedId
            const priceLabel  = `R$ ${v.effectivePrice.toFixed(2).replace('.', ',')}`
            const disabled    = !purchasable

            return (
              <button
                key={v.variantId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Tamanho ${v.size} — ${priceLabel}${disabled ? ' — esgotado' : ''}`}
                disabled={disabled}
                title={
                  disabled
                    ? 'Esgotado'
                    : `${priceLabel}${fulfillmentMode === 'from_stock' ? ` · ${v.stock} disponíveis` : ''}`
                }
                onClick={() => !disabled && onSelect(v)}
                className={[
                  'min-w-[3rem] min-h-[44px] px-3 py-2 rounded-xl border-2 font-sans font-medium text-sm transition-all',
                  'flex flex-col items-center justify-center gap-0.5',
                  disabled
                    ? 'border-andrequice-sand text-andrequice-border/40 cursor-not-allowed line-through decoration-andrequice-border/40'
                    : isSelected
                    ? 'border-andrequice-gold bg-andrequice-gold/10 text-andrequice-navy'
                    : errorState
                    ? 'border-andrequice-copper/60 text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy'
                    : 'border-andrequice-sand text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy',
                ].join(' ')}
              >
                <span className="text-base leading-none">{v.size}</span>
                <span
                  className={[
                    'text-[10px] leading-none tabular-nums',
                    disabled ? '' : 'text-andrequice-gold',
                  ].join(' ')}
                >
                  {priceLabel}
                </span>
              </button>
            )
          })
        )}
      </ChipRow>
    </div>
  )
}

/* ───────────────────────── helpers ──────────────────────────── */

interface ChipRowProps {
  label: string
  selectedLabel: string
  ariaLabel: string
  children: React.ReactNode
}

function ChipRow({ label, selectedLabel, ariaLabel, children }: ChipRowProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="font-sans text-sm font-medium text-andrequice-brown">
          {label}:
        </span>
        <span className="font-sans text-sm font-semibold text-andrequice-navy">
          {selectedLabel}
        </span>
      </div>
      <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  )
}

interface ChipProps {
  role?: 'radio' | 'checkbox'
  ariaChecked: boolean
  disabled: boolean
  selected: boolean
  errorState?: boolean
  onClick: () => void
  children: React.ReactNode
}

function Chip({ role = 'checkbox', ariaChecked, disabled, selected, errorState, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={ariaChecked}
      disabled={disabled}
      onClick={onClick}
      className={[
        'min-h-[40px] px-4 rounded-full border-2 font-sans font-medium text-sm transition-all',
        'flex items-center justify-center gap-2',
        disabled
          ? 'border-andrequice-sand text-andrequice-border/40 cursor-not-allowed'
          : selected
          ? 'border-andrequice-gold bg-andrequice-gold/10 text-andrequice-navy'
          : errorState
          ? 'border-andrequice-copper/60 text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy'
          : 'border-andrequice-sand text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy',
      ].join(' ')}
    >
      {/* Tiny checkbox glyph that flips when selected — gives a visual
          hint that this is a multi-step pick, not a single radio. */}
      <span
        aria-hidden
        className={[
          'inline-flex w-3.5 h-3.5 rounded-sm border items-center justify-center text-[10px] leading-none',
          selected
            ? 'border-andrequice-gold bg-andrequice-gold text-andrequice-cream'
            : 'border-current/40',
        ].join(' ')}
      >
        {selected ? '✓' : ''}
      </span>
      {children}
    </button>
  )
}
