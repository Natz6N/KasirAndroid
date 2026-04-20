import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import PINInput from '../components/PINInput';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import type { RootStackParamList, AdminTabParamList } from '../types/navigation';

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

const RootStack = createStackNavigator<RootStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

// Proper named component — stable reference, no inline function
function AdminPINScreen() {
  const setShowPIN = useAuthStore((s) => s.setShowPIN);
  useFocusEffect(
    React.useCallback(() => {
      setShowPIN(true);
      return () => setShowPIN(false);
    }, [setShowPIN])
  );
  return null;
}

function AdminTabNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { paddingBottom: 4 },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: 'grid-outline',
            Products: 'cube-outline',
            Categories: 'pricetag-outline',
            Settings: 'settings-outline',
          };
          return (
            <Ionicons
              name={(icons[route.name] ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <AdminTab.Screen name="Dashboard" component={DashboardScreen} />
      <AdminTab.Screen name="Products" component={ProductsScreen} />
      <AdminTab.Screen name="Categories" component={CategoriesScreen} />
      <AdminTab.Screen name="Settings" component={SettingsScreen} />
    </AdminTab.Navigator>
  );
}

function PINModal() {
  const { showPIN, setShowPIN, verifyPIN, isLocked } = useAuthStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    const ok = await verifyPIN(pin);
    setLoading(false);
    if (ok) {
      setPin('');
      // showPIN already set to false inside verifyPIN on success
    } else {
      setPin('');
      const locked = isLocked();
      Alert.alert(
        'PIN Salah',
        locked
          ? 'Terlalu banyak percobaan. Coba lagi dalam 60 detik.'
          : 'PIN tidak sesuai'
      );
    }
  };

  const handleCancel = () => {
    setPin('');
    setShowPIN(false);
  };

  return (
    <Modal visible={showPIN} transparent animationType="fade">
      <View style={pinStyles.overlay}>
        <View style={pinStyles.card}>
          <Text style={pinStyles.title}>Masuk Mode Admin</Text>
          <Text style={pinStyles.subtitle}>Masukkan PIN 6 digit</Text>
          <PINInput value={pin} onChange={setPin} onSubmit={handleVerify} />
          <View style={pinStyles.actions}>
            <TouchableOpacity style={pinStyles.cancelBtn} onPress={handleCancel}>
              <Text style={pinStyles.cancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                pinStyles.confirmBtn,
                (pin.length < 6 || loading) && { opacity: 0.5 },
              ]}
              onPress={handleVerify}
              disabled={pin.length < 6 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={pinStyles.confirmText}>Masuk</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function RootNavigator() {
  const { mode } = useAuthStore();

  return (
    <NavigationContainer>
      <PINModal />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {mode === 'kasir' ? (
          <>
            <RootStack.Screen name="KasirTabs" component={POSScreen} />
            <RootStack.Screen name="Cart" component={CartScreen} />
            <RootStack.Screen name="Payment" component={PaymentScreen} />
            <RootStack.Screen name="AdminPIN" component={AdminPINScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="AdminTabs" component={AdminTabNavigator} />
            <RootStack.Screen name="ProductForm" component={ProductFormScreen} />
            <RootStack.Screen name="SalesReport" component={SalesReportScreen} />
            <RootStack.Screen name="ProfitReport" component={ProfitReportScreen} />
            <RootStack.Screen name="StockReport" component={StockReportScreen} />
            <RootStack.Screen name="KasirTabs" component={POSScreen} />
            <RootStack.Screen name="Cart" component={CartScreen} />
            <RootStack.Screen name="Payment" component={PaymentScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const pinStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '80%',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: '#374151', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700' },
});
