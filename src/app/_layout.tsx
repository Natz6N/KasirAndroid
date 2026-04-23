import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PINInput from '../components/PINInput';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useAutolock } from '../hooks/useAutolock';
import { COLORS } from '../theme/colors';
import type { RootStackParamList, MainTabParamList } from '../types/navigation';

import POSScreen from './(kasir)/pos';
import CartScreen from './(kasir)/cart';
import PaymentScreen from './(kasir)/payment';
import DashboardScreen from './(admin)/dashboard';
import ProductsScreen from './(admin)/products/index';
import ProductFormScreen from './(admin)/products/[id]';
import CategoriesScreen from './(admin)/categories';
import SalesReportScreen from './(admin)/reports/sales';
import ProfitReportScreen from './(admin)/reports/profit';
import StockReportScreen from './(admin)/reports/stock';
import SettingsScreen from './(admin)/settings';
import TransactionsScreen from './(admin)/transactions';
import StockManagementScreen from './(admin)/stock';
import StockHistoryScreen from './(admin)/stock-history';
import ExpensesScreen from './(admin)/expenses';

const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Kasir: 'calculator-outline',
  Produk: 'cube-outline',
  Dashboard: 'grid-outline',
  Lainnya: 'menu-outline',
};

function TabNavigator() {
  useAutolock();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Ionicons
            name={(TAB_ICONS[route.name] ?? 'ellipse-outline') as any}
            size={22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Kasir" component={POSScreen} />
      <Tab.Screen name="Produk" component={ProductsScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Lainnya" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

/** Onboarding screen: Set up PIN for first time */
function SetupPINScreen() {
  const { setupPIN } = useAuthStore();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateSubmit = () => {
    if (pin.length !== 6) return;
    setFirstPin(pin);
    setPin('');
    setError('');
    setStep('confirm');
  };

  const handleConfirmSubmit = async () => {
    if (pin.length !== 6) return;
    if (pin !== firstPin) {
      setError('PIN tidak cocok. Coba lagi.');
      setPin('');
      return;
    }
    setLoading(true);
    const ok = await setupPIN(pin);
    setLoading(false);
    if (!ok) {
      setError('Gagal menyimpan PIN. Coba lagi.');
      setPin('');
    }
  };

  return (
    <SafeAreaView style={pinStyles.container}>
      <View style={pinStyles.inner}>
        <View style={pinStyles.logoBox}>
          <Ionicons name="storefront-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={pinStyles.appName}>Omah Krupuk POS</Text>
        <Text style={pinStyles.subtitle}>
          {step === 'create' ? 'Buat PIN 6 digit untuk mengamankan aplikasi' : 'Konfirmasi PIN yang baru dibuat'}
        </Text>
        
        {/* Step indicator */}
        <View style={pinStyles.stepRow}>
          <View style={[pinStyles.stepDot, pinStyles.stepDotActive]} />
          <View style={[pinStyles.stepLine, step === 'confirm' && pinStyles.stepLineActive]} />
          <View style={[pinStyles.stepDot, step === 'confirm' && pinStyles.stepDotActive]} />
        </View>

        {error ? <Text style={pinStyles.errorText}>{error}</Text> : null}

        <View style={pinStyles.pinWrapper}>
          <PINInput
            value={pin}
            onChange={setPin}
            onSubmit={step === 'create' ? handleCreateSubmit : handleConfirmSubmit}
          />
        </View>

        <TouchableOpacity
          style={[pinStyles.btn, (pin.length < 6 || loading) && { opacity: 0.5 }]}
          onPress={step === 'create' ? handleCreateSubmit : handleConfirmSubmit}
          disabled={pin.length < 6 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={pinStyles.btnText}>
              {step === 'create' ? 'Lanjut' : 'Konfirmasi & Mulai'}
            </Text>
          )}
        </TouchableOpacity>

        {step === 'confirm' && (
          <TouchableOpacity
            style={pinStyles.backBtn}
            onPress={() => { setStep('create'); setPin(''); setFirstPin(''); setError(''); }}
          >
            <Text style={pinStyles.backBtnText}>← Ubah PIN</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

/** PIN verification screen */
function PINScreen() {
  const { verifyPIN, isLocked, failCount } = useAuthStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    setError('');
    const ok = await verifyPIN(pin);
    setLoading(false);
    if (!ok) {
      setPin('');
      if (isLocked()) {
        setError('Terlalu banyak percobaan. Coba lagi dalam beberapa saat.');
      } else {
        setError(`PIN salah. ${5 - failCount} percobaan tersisa.`);
      }
    }
  };

  return (
    <SafeAreaView style={pinStyles.container}>
      <View style={pinStyles.inner}>
        <View style={pinStyles.logoBox}>
          <Ionicons name="storefront-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={pinStyles.appName}>Omah Krupuk POS</Text>
        <Text style={pinStyles.subtitle}>Masukkan PIN untuk melanjutkan</Text>

        {error ? <Text style={pinStyles.errorText}>{error}</Text> : null}

        <View style={pinStyles.pinWrapper}>
          <PINInput value={pin} onChange={setPin} onSubmit={handleVerify} />
        </View>

        <TouchableOpacity
          style={[pinStyles.btn, (pin.length < 6 || loading) && { opacity: 0.5 }]}
          onPress={handleVerify}
          disabled={pin.length < 6 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={pinStyles.btnText}>Masuk</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/** Splash / Loading screen */
function SplashScreen() {
  return (
    <View style={pinStyles.splashContainer}>
      <View style={pinStyles.logoBox}>
        <Ionicons name="storefront-outline" size={56} color={COLORS.primary} />
      </View>
      <Text style={pinStyles.appName}>Omah Krupuk POS</Text>
      <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 24 }} />
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, pinConfigured, checkPinStatus } = useAuthStore();
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    checkPinStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadSettings();
  }, [isAuthenticated]);

  // Still loading PIN status
  if (pinConfigured === null) {
    return <SplashScreen />;
  }

  // PIN not configured → setup flow
  if (!pinConfigured) {
    return <SetupPINScreen />;
  }

  // PIN configured but not authenticated → verify
  if (!isAuthenticated) {
    return <PINScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={TabNavigator} />
        <RootStack.Screen name="Cart" component={CartScreen} />
        <RootStack.Screen name="Payment" component={PaymentScreen} />
        <RootStack.Screen name="ProductForm" component={ProductFormScreen} />
        <RootStack.Screen name="Categories" component={CategoriesScreen} />
        <RootStack.Screen name="Transactions" component={TransactionsScreen} />
        <RootStack.Screen name="StockManagement" component={StockManagementScreen} />
        <RootStack.Screen name="StockHistory" component={StockHistoryScreen} />
        <RootStack.Screen name="SalesReport" component={SalesReportScreen} />
        <RootStack.Screen name="ProfitReport" component={ProfitReportScreen} />
        <RootStack.Screen name="StockReport" component={StockReportScreen} />
        <RootStack.Screen name="Expenses" component={ExpensesScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const pinStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  logoBox: {
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  pinWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 56,
    marginTop: 16,
    elevation: 2,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backBtn: {
    marginTop: 12,
    padding: 8,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
