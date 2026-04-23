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
import { ExpenseRepository } from '../../repositories/ExpenseRepository';
import { useAuthStore } from '../../stores/authStore';
import { formatRupiah, calculateGrossMargin } from '../../utils/formatCurrency';
import EmptyState from '../../components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../theme/colors';
import type { Product } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

const txRepo = new TransactionRepository();
const productRepo = new ProductRepository();
const expenseRepo = new ExpenseRepository();

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const lock = useAuthStore((s) => s.lock);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todaySummary, setTodaySummary] = useState<{
    jumlah_transaksi: number;
    total_penjualan: number;
    total_hpp: number;
    gross_profit: number;
  } | null>(null);
  const [todayExpense, setTodayExpense] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [summary, lowStock, expenseTotal] = await Promise.all([
        txRepo.getTodaySummary(),
        productRepo.getLowStock(),
        expenseRepo.getTodayTotal(),
      ]);
      setTodaySummary(summary ?? null);
      setLowStockProducts(lowStock);
      setTodayExpense(expenseTotal);
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

  const grossProfit = todaySummary?.gross_profit ?? 0;
  const netProfit = grossProfit - todayExpense;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.lg }]}>
        <View>
          <Text style={styles.headerSubtitle}>Ringkasan Toko</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={lock} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="lock-closed-outline" size={24} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACING.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {error && <EmptyState type="error" message={error} onRetry={load} />}
        
        {/* Today Summary */}
        <Text style={styles.sectionTitle}>Hari Ini</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
            <Text style={styles.statLabel}>Transaksi</Text>
            <Text style={[styles.statValue, { color: COLORS.primaryDark }]}>{todaySummary?.jumlah_transaksi ?? 0}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Text style={styles.statLabel}>Omzet</Text>
            <Text style={[styles.statValue, { fontSize: 16, color: '#166534' }]}>
              {formatRupiah(todaySummary?.total_penjualan ?? 0)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <Text style={styles.statLabel}>Profit Kotor</Text>
            <Text style={[styles.statValue, { fontSize: 16, color: '#9A3412' }]}>
              {formatRupiah(grossProfit)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Text style={styles.statLabel}>Pengeluaran</Text>
            <Text style={[styles.statValue, { fontSize: 16, color: '#DC2626' }]}>
              {formatRupiah(todayExpense)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: netProfit >= 0 ? '#F0FDF4' : '#FEF2F2', borderColor: netProfit >= 0 ? '#BBF7D0' : '#FECACA' }]}>
            <Text style={styles.statLabel}>Laba Bersih</Text>
            <Text style={[styles.statValue, { fontSize: 16, color: netProfit >= 0 ? '#166534' : '#DC2626' }]}>
              {formatRupiah(netProfit)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FDF4FF', borderColor: '#F5D0FE' }]}>
            <Text style={styles.statLabel}>Margin</Text>
            <Text style={[styles.statValue, { color: '#86198F' }]}>{margin}%</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Menu</Text>
        <View style={styles.menuGrid}>
          {[
            { label: 'Kategori', icon: 'pricetag-outline', screen: 'Categories' },
            { label: 'Transaksi', icon: 'receipt-outline', screen: 'Transactions' },
            { label: 'Kelola Stok', icon: 'archive-outline', screen: 'StockManagement' },
            { label: 'Pengeluaran', icon: 'wallet-outline', screen: 'Expenses' },
            { label: 'Lap. Penjualan', icon: 'bar-chart-outline', screen: 'SalesReport' },
            { label: 'Lap. Profit', icon: 'trending-up-outline', screen: 'ProfitReport' },
            { label: 'Lap. Stok', icon: 'layers-outline', screen: 'StockReport' },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.8}
            >
              <View style={styles.menuIconWrapper}>
                <Ionicons name={item.icon as any} size={26} color={COLORS.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <View style={styles.alertSection}>
            <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>
              Stok Rendah ({lowStockProducts.length})
            </Text>
            {lowStockProducts.slice(0, 5).map((p) => (
              <View key={p.id} style={styles.alertRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertName}>{p.name}</Text>
                  <Text style={styles.alertStock}>
                    Tersisa: <Text style={{fontWeight: '700'}}>{p.stock}</Text> {p.unit} (Min: {p.min_stock})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProductForm', { productId: p.id })}
                  style={styles.alertBtn}
                >
                  <Ionicons name="create-outline" size={20} color="#B45309" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerSubtitle: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.surface, letterSpacing: -0.5 },
  logoutBtn: { 
    padding: SPACING.sm, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: RADIUS.full 
  },
  body: { padding: SPACING.lg, gap: SPACING.xl },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: -SPACING.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: SPACING.xs },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  menuCard: {
    width: '30%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.sm,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuIconWrapper: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  menuLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', textAlign: 'center' },
  alertSection: { gap: SPACING.sm },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7', // amber-100
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    elevation: 1,
  },
  alertName: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  alertStock: { fontSize: 13, color: '#B45309', marginTop: 4 },
  alertBtn: {
    backgroundColor: '#FDE68A',
    padding: 8,
    borderRadius: RADIUS.md,
  }
});
