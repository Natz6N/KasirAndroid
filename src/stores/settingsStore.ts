import { create } from 'zustand';
import { getDatabase } from '../database/db';
import type { AppSettings } from '../types/database';

interface SettingsStore {
  settings: AppSettings | null;
  load: () => Promise<void>;
  update: (data: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,

  load: async () => {
    const db = await getDatabase();
    const s = await db.getFirstAsync<AppSettings>('SELECT * FROM app_settings WHERE id = 1');
    set({ settings: s ?? null });
  },

  update: async (data) => {
    const db = await getDatabase();
    const keys = Object.keys(data) as (keyof typeof data)[];
    if (keys.length === 0) return;
    const setClauses = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => (data as any)[k]);
    await db.runAsync(
      `UPDATE app_settings SET ${setClauses}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = 1`,
      values
    );
    const updated = await db.getFirstAsync<AppSettings>('SELECT * FROM app_settings WHERE id = 1');
    set({ settings: updated ?? null });
  },
}));
