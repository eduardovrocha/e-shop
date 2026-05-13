import { cn } from '@/lib/utils'

interface SectionTitleProps {
  title: string
  subtitle?: string
  center?: boolean
  className?: string
}

export function SectionTitle({ title, subtitle, center = false, className }: SectionTitleProps) {
  return (
    <div className={cn('flex flex-col gap-1', center && 'text-center items-center', className)}>
      <h2 className="font-serif text-2xl font-semibold text-andrequice-navy tracking-display leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-andrequice-border font-sans leading-relaxed">{subtitle}</p>
      )}
    </div>
  )
}
