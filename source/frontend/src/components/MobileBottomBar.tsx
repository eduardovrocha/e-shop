import { cn } from '@/lib/utils'

interface MobileBottomBarProps {
  children: React.ReactNode
  className?: string
}

export function MobileBottomBar({ children, className }: MobileBottomBarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30',
        'bg-andrequice-cream/95 backdrop-blur-md',
        'border-t border-andrequice-sand',
        'px-4 pt-3 pb-safe',
        'shadow-[0_-4px_24px_rgba(74,46,26,0.10)]',
        className
      )}
    >
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  )
}
