import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'

interface PriceTagProps {
  value: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl',
}

export function PriceTag({ value, size = 'md', className }: PriceTagProps) {
  return (
    <span
      className={cn(
        'font-sans font-semibold text-andrequice-gold tracking-tight',
        sizes[size],
        className
      )}
    >
      {formatPrice(value)}
    </span>
  )
}
