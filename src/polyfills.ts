/**
 * polyfills.ts
 *
 * Harus di-import PERTAMA di index.js (sebelum Expo AppEntry),
 * agar semua polyfill aktif sebelum library apapun diload.
 *
 * Masalah yang di-fix:
 * React Native 0.83+ menghapus InteractionManager.runAfterInteractions
 * dari beberapa internal path dan menggantinya dengan requestIdleCallback.
 * Library seperti @react-navigation/stack masih memicu WARN ini karena
 * RN belum menyediakan global requestIdleCallback secara default di Hermes/JSC.
 */

// ── requestIdleCallback polyfill ──────────────────────────────────────────────
// Mirip dengan implementasi browser: callback dipanggil saat JS thread idle,
// dengan deadline.timeRemaining() dan didTimeout flag.
if (typeof (global as any).requestIdleCallback === 'undefined') {
  (global as any).requestIdleCallback = function requestIdleCallback(
    callback: (deadline: IdleDeadline) => void,
    options?: IdleRequestOptions
  ): number {
    const timeout = options?.timeout ?? 1;
    const start = Date.now();
    return setTimeout(function () {
      callback({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        },
      });
    }, timeout) as unknown as number;
  };
}

if (typeof (global as any).cancelIdleCallback === 'undefined') {
  (global as any).cancelIdleCallback = function cancelIdleCallback(id: number): void {
    clearTimeout(id);
  };
}
