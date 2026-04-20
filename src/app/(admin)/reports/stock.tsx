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
import { StockRepository } from '../../../repositories/StockRepository';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { ReportService } from '../../../services/ReportService';
import { ExportService } from '../../../services/ExportService';
import { formatRupiah } from '../../../utils/formatCurrency';
import EmptyState from '../../../components/EmptyState';

const stockRepo = new StockRepository();
const productRepo = new ProductRepository();
const reportService = new ReportService();
const exportService = new ExportService();

export default function StockReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [tab, setTab] = useState<'low' | 'movement' | 'unselling'>('low');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'low') {
        setData(await productRepo.getLowStock());
      } else if (tab === 'movement') {
        setData(await stockRepo.getMonthlySummary());
      } else {
        setData(await reportService.getUnsellingProducts());
      }
    } catch {
      setError('Gagal memuat data stok');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => { load(); }, [tab]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Stok</Text>
        <TouchableOpacity
          onPress={() => exportService.toExcel(data, 'Stok', `laporan_stok_${tab}`)}
          disabled={data.length === 0}
        >
          <Ionicons name="download-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab */}
      <View style={styles.tabs}>
        {([
          { key: 'low', label: 'Stok Rendah' },
          { key: 'movement', label: 'Rekap Stok' },
          { key: 'unselling', label: 'Tidak Laku' },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r, i) => String(r.id ?? r.name ?? i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="Tidak ada data" message="Tidak ada data untuk ditampilkan" />}
          renderItem={({ item: r }) => {
            if (tab === 'low') return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  <Text style={styles.rowMeta}>{r.category_name ?? 'Tanpa Kategori'}</Text>
                </View>
                <Text style={[styles.stockBadge, r.stock === 0 ? styles.stockEmpty : styles.stockLow]}>
                  {r.stock} / {r.min_stock} {r.unit}
                </Text>
              </View>
            );
            if (tab === 'movement') return (
              <View style={styles.row}>
                <Text style={[styles.rowName, { flex: 2 }]} numberOfLines={1}>{r.name}</Text>
                <Text style={[styles.td, { flex: 1, color: '#22C55E' }]}>+{r.total_masuk}</Text>
                <Text style={[styles.td, { flex: 1, color: '#EF4444' }]}>-{r.total_keluar}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{r.stok_sekarang}</Text>
              </View>
            );
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  <Text style={styles.rowMeta}>{r.category_name ?? 'Tanpa Kategori'} · Stok: {r.stock}</Text>
                </View>
                <Text style={styles.sellPrice}>{formatRupiah(r.sell_price)}</Text>
              </View>
            );
          }}
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
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 12, color: '#6B7280' },
  tabTextActive: { color: '#6366F1', fontWeight: '700' },
  list: { padding: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 6, elevation: 1, gap: 8,
  },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  stockBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockLow: { backgroundColor: '#FEF3C7', color: '#D97706' },
  stockEmpty: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  td: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  sellPrice: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
});
