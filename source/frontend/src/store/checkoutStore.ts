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

export interface CheckoutContact {
  name: string
  phone: string
  email: string
}

export interface CheckoutAddressExtra {
  number: string
  complement: string
}

interface CheckoutState {
  deliveryMethod: 'delivery' | 'pickup'
  selectedShipping: SelectedShipping | null
  shippingAddress: ShippingAddress | null
  contact: CheckoutContact
  addressExtra: CheckoutAddressExtra
  setDeliveryMethod: (method: 'delivery' | 'pickup') => void
  setSelectedShipping: (opt: SelectedShipping | null) => void
  setShippingAddress: (addr: ShippingAddress) => void
  setContact: (contact: CheckoutContact) => void
  setAddressExtra: (extra: CheckoutAddressExtra) => void
  clear: () => void
}

const EMPTY_CONTACT: CheckoutContact = { name: '', phone: '', email: '' }
const EMPTY_ADDRESS_EXTRA: CheckoutAddressExtra = { number: '', complement: '' }

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      deliveryMethod: 'delivery',
      selectedShipping: null,
      shippingAddress: null,
      contact: EMPTY_CONTACT,
      addressExtra: EMPTY_ADDRESS_EXTRA,
      setDeliveryMethod: (deliveryMethod) => set({ deliveryMethod }),
      setSelectedShipping: (selectedShipping) => set({ selectedShipping }),
      setShippingAddress: (shippingAddress) => set({ shippingAddress }),
      setContact: (contact) => set({ contact }),
      setAddressExtra: (addressExtra) => set({ addressExtra }),
      clear: () =>
        set({
          deliveryMethod: 'delivery',
          selectedShipping: null,
          shippingAddress: null,
          contact: EMPTY_CONTACT,
          addressExtra: EMPTY_ADDRESS_EXTRA,
        }),
    }),
    {
      name: 'andrequice-checkout-v1',
      // Persist delivery method + contact + address extras across reloads.
      // shippingAddress/selectedShipping are session-scoped (recalculated
      // every visit) so we keep them out of disk to avoid stale freight.
      partialize: (state) => ({
        deliveryMethod: state.deliveryMethod,
        contact:        state.contact,
        addressExtra:   state.addressExtra,
      }),
    }
  )
)
