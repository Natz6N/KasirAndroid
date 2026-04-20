import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/app/_layout';
import { checkIntegrity, recoverPendingTransactions } from './src/database/db';
import { useSettingsStore } from './src/stores/settingsStore';

export default function App() {
  const { load: loadSettings } = useSettingsStore();

  useEffect(() => {
    (async () => {
      await recoverPendingTransactions();
      const ok = await checkIntegrity();
      if (!ok) {
        Alert.alert(
          'Peringatan Database',
          'Terdapat masalah pada database. Harap lakukan backup segera.',
          [{ text: 'OK' }]
        );
      }
      await loadSettings();
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
