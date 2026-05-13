import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore } from '@/store/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('starts with no toasts', () => {
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('adds a toast with default variant', () => {
    useToastStore.getState().add('hello')
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('hello')
    expect(toasts[0].variant).toBe('default')
    expect(toasts[0].id).toBeTruthy()
  })

  it('adds a toast with explicit variant', () => {
    useToastStore.getState().add('saved', 'success')
    expect(useToastStore.getState().toasts[0].variant).toBe('success')
  })

  it('accumulates multiple toasts', () => {
    useToastStore.getState().add('one')
    useToastStore.getState().add('two')
    expect(useToastStore.getState().toasts).toHaveLength(2)
  })

  it('removes a toast by id', () => {
    useToastStore.getState().add('to remove')
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().remove(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('removes only the targeted toast', () => {
    useToastStore.getState().add('keep')
    useToastStore.getState().add('remove')
    const idToRemove = useToastStore.getState().toasts[1].id
    useToastStore.getState().remove(idToRemove)
    const remaining = useToastStore.getState().toasts
    expect(remaining).toHaveLength(1)
    expect(remaining[0].message).toBe('keep')
  })
})
