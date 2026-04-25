/**
 * index.js — Entry point aplikasi
 *
 * URUTAN PENTING:
 * 1. Polyfill diload pertama (sebelum library apapun)
 * 2. Baru Expo AppEntry (yang me-register root component)
 *
 * Ini adalah satu-satunya cara yang benar untuk memastikan
 * requestIdleCallback tersedia sebelum React Navigation dan
 * library lain mulai menggunakannya — menghilangkan WARN
 * "InteractionManager has been deprecated".
 */
import './src/polyfills';
import 'expo/AppEntry';
