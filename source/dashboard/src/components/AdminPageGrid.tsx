import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
}

export function AdminPageGrid({ children, className }: Props) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {children}
    </div>
  )
}
