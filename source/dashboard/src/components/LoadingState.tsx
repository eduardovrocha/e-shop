import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  rows?: number
}

export function LoadingState({ message = 'Carregando...', rows = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg bg-muted h-12" />
      ))}
      <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  )
}
