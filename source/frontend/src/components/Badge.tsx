import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'gold' | 'sand' | 'navy' | 'copper'
  className?: string
}

const variants = {
  gold: 'bg-andrequice-gold/20 text-andrequice-copper border-andrequice-gold/40',
  sand: 'bg-andrequice-sand text-andrequice-brown border-andrequice-border',
  navy: 'bg-andrequice-navy/10 text-andrequice-navy border-andrequice-navy/20',
  copper: 'bg-andrequice-copper/15 text-andrequice-copper border-andrequice-copper/30',
}

export function Badge({ children, variant = 'gold', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
