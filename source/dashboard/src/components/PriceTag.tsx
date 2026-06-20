import { cn, formatCurrency } from '@/lib/utils'

interface PriceTagProps {
  // valor em centavos
  cents: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<PriceTagProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base font-semibold',
  lg: 'text-xl font-bold',
}

// Exibição de preço portada do storefront para o dashboard (apps isolados).
export function PriceTag({ cents, size = 'md', className }: PriceTagProps) {
  return (
    <span className={cn('tabular-nums text-andrequice-navy', SIZE_CLASSES[size], className)}>
      {formatCurrency(cents)}
    </span>
  )
}
