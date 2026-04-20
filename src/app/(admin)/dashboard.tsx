import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { ProductRepository } from '../../repositories/ProductRepository';
import { useAuthStore } from '../../stores/authStore';
import { formatRupiah, calculateGrossMargin } from '../../utils/formatCurrency';
import EmptyState from '../../components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import type { Product } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

const txRepo = new TransactionRepository();
const productRepo = new ProductRepository();

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todaySummary, setTodaySummary] = useState<{
    jumlah_transaksi: number;
    total_penjualan: number;
    total_hpp: number;
    gross_profit: number;
  } | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [summary, lowStock] = await Promise.all([
        txRepo.getTodaySummary(),
        productRepo.getLowStock(),
      ]);
      setTodaySummary(summary ?? null);
      setLowStockProducts(lowStock);
    } catch {
      setError('Gagal memuat data dashboard');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const margin = todaySummary
    ? calculateGrossMargin(todaySummary.total_penjualan, todaySummary.total_hpp)
    : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error && <EmptyState type="error" message={error} onRetry={load} />}
        {/* Today Summary */}
        <Text style={styles.sectionTitle}>Hari Ini</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.statLabel}>Transaksi</Text>
            <Text style={styles.statValue}>{todaySummary?.jumlah_transaksi ?? 0}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.statLabel}>Omzet</Text>
            <Text style={[styles.statValue, { fontSize: 14 }]}>
              {formatRupiah(todaySummary?.total_penjualan ?? 0)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.statLabel}>Profit</Text>
            <Text style={[styles.statValue, { fontSize: 14 }]}>
              {formatRupiah(todaySummary?.gross_profit ?? 0)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FDF4FF' }]}>
            <Text style={styles.statLabel}>Margin</Text>
            <Text style={styles.statValue}>{margin}%</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Menu</Text>
        <View style={styles.menuGrid}>
          {[
            { label: 'Produk', icon: 'cube-outline', screen: 'Products' },
            { label: 'Kategori', icon: 'pricetag-outline', screen: 'Categories' },
            { label: 'Lap. Penjualan', icon: 'bar-chart-outline', screen: 'SalesReport' },
            { label: 'Lap. Profit', icon: 'trending-up-outline', screen: 'ProfitReport' },
            { label: 'Lap. Stok', icon: 'layers-outline', screen: 'StockReport' },
            { label: 'Pengaturan', icon: 'settings-outline', screen: 'Settings' },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.screen as any)}
            >
              <Ionicons name={item.icon as any} size={28} color="#6366F1" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Stok Rendah ({lowStockProducts.length})
            </Text>
            {lowStockProducts.slice(0, 5).map((p) => (
              <View key={p.id} style={styles.alertRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertName}>{p.name}</Text>
                  <Text style={styles.alertStock}>
                    Stok: {p.stock} / Min: {p.min_stock} {p.unit}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProductForm', { productId: p.id })}
                >
                  <Ionicons name="create-outline" size={20} color="#6366F1" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  logoutBtn: { padding: 4 },
  body: { padding: 16, gap: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 14,
  },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  menuCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    elevation: 1,
  },
  menuLabel: { fontSize: 12, color: '#374151', fontWeight: '500', textAlign: 'center' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  alertName: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  alertStock: { fontSize: 12, color: '#B45309', marginTop: 2 },
});
