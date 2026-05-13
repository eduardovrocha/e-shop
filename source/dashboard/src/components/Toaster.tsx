import * as Toast from '@radix-ui/react-toast'
import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { useToastStore, type ToastItem } from '@/store/toastStore'
import { cn } from '@/lib/utils'

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
  default: null,
}

function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 4000)
    return () => clearTimeout(timer)
  }, [onRemove])

  return (
    <Toast.Root
      open
      onOpenChange={(open) => !open && onRemove()}
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-lg',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-0'
      )}
    >
      {ICONS[toast.variant]}
      <Toast.Description className="flex-1 text-sm text-foreground">
        {toast.message}
      </Toast.Description>
      <Toast.Close asChild>
        <button
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </Toast.Close>
    </Toast.Root>
  )
}

export function Toaster() {
  const { toasts, remove } = useToastStore()

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => remove(toast.id)} />
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
    </Toast.Provider>
  )
}
