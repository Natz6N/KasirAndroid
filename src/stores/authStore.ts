import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDatabase, isPinConfigured } from '../database/db';

interface AuthStore {
  isAuthenticated: boolean;
  pinConfigured: boolean | null; // null = loading, false = needs setup, true = needs verify
  failCount: number;
  lockedUntil: number | null;
  checkPinStatus: () => Promise<void>;
  setupPIN: (pin: string) => Promise<boolean>;
  verifyPIN: (pin: string) => Promise<boolean>;
  lock: () => void;
  isLocked: () => boolean;
}

async function hashPIN(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  pinConfigured: null,
  failCount: 0,
  lockedUntil: null,

  checkPinStatus: async () => {
    try {
      const configured = await isPinConfigured();
      set({ pinConfigured: configured });
      if (!configured) {
        // No PIN configured → skip auth, go straight to app
        // (user will be prompted to set up PIN via onboarding)
        set({ isAuthenticated: false, pinConfigured: false });
      }
    } catch {
      // DB not ready yet, treat as not configured
      set({ pinConfigured: false });
    }
  },

  setupPIN: async (pin: string) => {
    try {
      const db = await getDatabase();
      const hashed = await hashPIN(pin);
      await db.runAsync(
        "UPDATE app_settings SET admin_pin = ?, pin_configured = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = 1",
        [hashed]
      );
      set({ isAuthenticated: true, pinConfigured: true, failCount: 0, lockedUntil: null });
      return true;
    } catch {
      return false;
    }
  },

  verifyPIN: async (pin: string) => {
    if (get().isLocked()) return false;

    try {
      const db = await getDatabase();
      const settings = await db.getFirstAsync<{ admin_pin: string }>(
        'SELECT admin_pin FROM app_settings WHERE id = 1'
      );
      if (!settings) return false;

      const hashed = await hashPIN(pin);
      if (hashed === settings.admin_pin) {
        set({ isAuthenticated: true, failCount: 0, lockedUntil: null });
        return true;
      }

      const newCount = get().failCount + 1;
      if (newCount >= 5) {
        // Exponential lockout: 60s, 120s, 300s, 600s, 1800s, 3600s
        const lockDurations = [60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000];
        const lockIndex = Math.min(Math.floor((newCount - 5) / 1), lockDurations.length - 1);
        set({ failCount: newCount, lockedUntil: Date.now() + lockDurations[lockIndex] });
      } else {
        set({ failCount: newCount });
      }
      return false;
    } catch {
      return false;
    }
  },

  lock: () => set({ isAuthenticated: false, failCount: 0, lockedUntil: null }),

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
