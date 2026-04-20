import { create } from 'zustand';
import type { CartItem, Product } from '../types/database';

interface CartStore {
  items: CartItem[];
  discountAmount: number;
  addItem: (product: Product) => void;
  updateQuantity: (productId: number, qty: number) => void;
  updateDiscount: (productId: number, discount: number) => void;
  removeItem: (productId: number) => void;
  setTransactionDiscount: (amount: number) => void;
  clear: () => void;
  subtotal: () => number;
  totalAmount: () => number;
}

function computeSubtotal(item: CartItem): number {
  return (item.product.sell_price - item.discount_per_item) * item.quantity;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  discountAmount: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1, subtotal: computeSubtotal({ ...i, quantity: i.quantity + 1 }) }
              : i
          ),
        };
      }
      const newItem: CartItem = {
        product,
        quantity: 1,
        discount_per_item: 0,
        subtotal: product.sell_price,
      };
      return { items: [...state.items, newItem] };
    });
  },

  updateQuantity: (productId, qty) => {
    if (qty < 1) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: qty, subtotal: computeSubtotal({ ...i, quantity: qty }) }
          : i
      ),
    }));
  },

  updateDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? { ...i, discount_per_item: discount, subtotal: computeSubtotal({ ...i, discount_per_item: discount }) }
          : i
      ),
    }));
  },

  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) }));
  },

  setTransactionDiscount: (amount) => set({ discountAmount: amount }),

  clear: () => set({ items: [], discountAmount: 0 }),

  subtotal: () => get().items.reduce((s, i) => s + i.subtotal, 0),

  totalAmount: () => get().subtotal() - get().discountAmount,
}));
