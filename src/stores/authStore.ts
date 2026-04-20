import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../database/db';

type AppMode = 'kasir' | 'admin';

interface AuthStore {
  mode: AppMode;
  failCount: number;
  lockedUntil: number | null;
  showPIN: boolean;
  setShowPIN: (v: boolean) => void;
  verifyPIN: (pin: string) => Promise<boolean>;
  logout: () => void;
  isLocked: () => boolean;
}

async function hashPIN(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  mode: 'kasir',
  failCount: 0,
  lockedUntil: null,
  showPIN: false,

  setShowPIN: (v) => set({ showPIN: v }),

  verifyPIN: async (pin: string) => {
    if (get().isLocked()) return false;

    const db = await getDatabase();
    const settings = await db.getFirstAsync<{ admin_pin: string }>(
      'SELECT admin_pin FROM app_settings WHERE id = 1'
    );
    if (!settings) return false;

    const hashed = await hashPIN(pin);
    if (hashed === settings.admin_pin) {
      set({ mode: 'admin', failCount: 0, lockedUntil: null, showPIN: false });
      return true;
    }

    const newCount = get().failCount + 1;
    if (newCount >= 5) {
      set({ failCount: newCount, lockedUntil: Date.now() + 60_000 });
    } else {
      set({ failCount: newCount });
    }
    return false;
  },

  logout: () => set({ mode: 'kasir', failCount: 0, lockedUntil: null, showPIN: false }),

  isLocked: () => {
    const { lockedUntil } = get();
    if (!lockedUntil) return false;
    if (Date.now() >= lockedUntil) {
      set({ lockedUntil: null, failCount: 0 });
      return false;
    }
    return true;
  },
}));
