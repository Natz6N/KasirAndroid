import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

export function useAutolock() {
  const lock = useAuthStore((s) => s.lock);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const settings = useSettingsStore((s) => s.settings);
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    const autolockMinutes = settings?.autolock_minutes ?? 5;
    if (autolockMinutes <= 0) return; // 0 = disabled

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastActiveRef.current;
        const threshold = autolockMinutes * 60 * 1000;
        if (elapsed >= threshold) {
          lock();
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        lastActiveRef.current = Date.now();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isAuthenticated, settings?.autolock_minutes, lock]);
}
