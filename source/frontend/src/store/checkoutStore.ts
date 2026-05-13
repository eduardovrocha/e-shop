import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShippingAddress {
  cep: string
  street: string
  city: string
  state: string
}

interface SelectedShipping {
  serviceId: number
  priceCents: number
  carrier: string
  service: string
  deliveryDays: number
}

interface CheckoutState {
  deliveryMethod: 'delivery' | 'pickup'
  selectedShipping: SelectedShipping | null
  shippingAddress: ShippingAddress | null
  setDeliveryMethod: (method: 'delivery' | 'pickup') => void
  setSelectedShipping: (opt: SelectedShipping | null) => void
  setShippingAddress: (addr: ShippingAddress) => void
  clear: () => void
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      deliveryMethod: 'delivery',
      selectedShipping: null,
      shippingAddress: null,
      setDeliveryMethod: (deliveryMethod) => set({ deliveryMethod }),
      setSelectedShipping: (selectedShipping) => set({ selectedShipping }),
      setShippingAddress: (shippingAddress) => set({ shippingAddress }),
      clear: () => set({ deliveryMethod: 'delivery', selectedShipping: null, shippingAddress: null }),
    }),
    {
      name: 'andrequice-checkout-v1',
      partialize: (state) => ({ deliveryMethod: state.deliveryMethod }),
    }
  )
)
