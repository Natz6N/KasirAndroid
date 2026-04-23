import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/app/_layout';
import { checkIntegrity, recoverPendingTransactions } from './src/database/db';
import { useSettingsStore } from './src/stores/settingsStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
