import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: number
  variantId: number
  name: string
  size: string
  price: number
  quantity: number
  imageUrl?: string
  fulfillmentMode?: 'from_stock' | 'made_to_order'
  productionLeadTimeDays?: number | null
}

// Snapshot of a fully-validated coupon application (passed both layers
// of validation on the backend). Persisted alongside the cart so the
// reload survives /cart → /checkout. Cleared by clearCart() and by
// removeCoupon(). The chip in <CouponInput> reads from here.
export interface AppliedCoupon {
  code: string
  email: string
  discountCents: number
  eligibleProductIds: number[]
}

interface CartState {
  items: CartItem[]
  appliedCoupon: AppliedCoupon | null
  addItem: (item: CartItem) => void
  removeItem: (variantId: number) => void
  updateQuantity: (variantId: number, quantity: number) => void
  clearCart: () => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      addItem: (item) => {
        const existing = get().items.find((i) => i.variantId === item.variantId)
        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          }))
        } else {
          set((state) => ({ items: [...state.items, item] }))
        }
        // Any change to cart contents invalidates the prior coupon — the
        // server-side recomputation would happen anyway at create_intent,
        // but it's nicer UX to drop it here so the customer re-validates
        // and sees an up-to-date discount.
        set({ appliedCoupon: null })
      },
      removeItem: (variantId) => {
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) }))
        set({ appliedCoupon: null })
      },
      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        }))
        set({ appliedCoupon: null })
      },
      clearCart: () => set({ items: [], appliedCoupon: null }),
      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
      removeCoupon: () => set({ appliedCoupon: null }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'andrequice-cart-v2' }
  )
)
