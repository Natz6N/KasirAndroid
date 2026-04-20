import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportService } from '../../../services/ReportService';
import { ExportService } from '../../../services/ExportService';
import { formatRupiah } from '../../../utils/formatCurrency';
import { getMonthRange } from '../../../utils/dateHelper';
import EmptyState from '../../../components/EmptyState';

const reportService = new ReportService();
const exportService = new ExportService();

export default function ProfitReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [data, setData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getMonthRange(offset);
      const [rows, top] = await Promise.all([
        reportService.getProfitByCategory(start, end),
        reportService.getTopProducts(start),
      ]);
      setData(rows);
      setTopProducts(top);
    } catch {
      setError('Gagal memuat laporan profit');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(monthOffset); }, [monthOffset]);

  const monthLabel = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Profit</Text>
        <TouchableOpacity
          onPress={() => exportService.toExcel(topProducts, 'Top Produk', 'laporan_profit')}
          disabled={topProducts.length === 0}
        >
          <Ionicons name="download-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => setMonthOffset((m) => m - 1)}>
          <Ionicons name="chevron-back" size={22} color="#6366F1" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setMonthOffset((m) => Math.min(m + 1, 0))}>
          <Ionicons name="chevron-forward" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={() => load(monthOffset)} />
      ) : (
        <FlatList
          data={topProducts}
          keyExtractor={(r, i) => String(r.product_id ?? i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="Tidak ada data" message="Belum ada data profit bulan ini" />}
          ListHeaderComponent={
            <>
              {/* Profit by Category */}
              <Text style={styles.sectionTitle}>Profit per Kategori</Text>
              {data.map((r, i) => (
                <View key={i} style={styles.catRow}>
                  <Text style={styles.catName}>{r.kategori}</Text>
                  <View style={styles.catMetrics}>
                    <Text style={styles.metricText}>Omzet: {formatRupiah(r.revenue)}</Text>
                    <Text style={[styles.metricText, { color: '#22C55E' }]}>Profit: {formatRupiah(r.profit)}</Text>
                  </View>
                </View>
              ))}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Top 10 Produk Terlaris</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 3 }]}>Produk</Text>
                <Text style={[styles.th, { flex: 1 }]}>Terjual</Text>
                <Text style={[styles.th, { flex: 2 }]}>Profit</Text>
              </View>
            </>
          }
          renderItem={({ item: r, index }) => (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 3 }]} numberOfLines={1}>
                {index + 1}. {r.product_name}
              </Text>
              <Text style={[styles.td, { flex: 1 }]}>{r.total_terjual}</Text>
              <Text style={[styles.td, { flex: 2, color: '#22C55E' }]}>{formatRupiah(r.total_profit)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#6366F1', paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 12 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#374151', minWidth: 150, textAlign: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  catRow: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, elevation: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  catName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  catMetrics: { alignItems: 'flex-end' },
  metricText: { fontSize: 12, color: '#6B7280' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#EEF2FF', borderRadius: 8, padding: 8, marginBottom: 4 },
  th: { fontSize: 11, fontWeight: '700', color: '#6366F1', textAlign: 'center' },
  tableRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 8, padding: 8, marginBottom: 4, elevation: 1,
  },
  td: { fontSize: 11, color: '#374151', textAlign: 'center' },
});
