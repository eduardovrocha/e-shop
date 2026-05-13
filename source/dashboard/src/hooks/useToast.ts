import { useToastStore } from '@/store/toastStore'

export function useToast() {
  const { add } = useToastStore()
  return {
    success: (message: string) => add(message, 'success'),
    error: (message: string) => add(message, 'error'),
    warning: (message: string) => add(message, 'warning'),
    info: (message: string) => add(message, 'default'),
  }
}
