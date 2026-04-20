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
import { getMonthRange, formatDisplayDate } from '../../../utils/dateHelper';
import EmptyState from '../../../components/EmptyState';
import type { DailySalesRow } from '../../../types/database';

const reportService = new ReportService();
const exportService = new ExportService();

export default function SalesReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [data, setData] = useState<DailySalesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getMonthRange(offset);
      const rows = await reportService.getDailySales(start, end);
      setData(rows);
    } catch {
      setError('Gagal memuat laporan penjualan');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(monthOffset); }, [monthOffset]);

  const totals = data.reduce(
    (acc, r) => ({
      transaksi: acc.transaksi + r.jumlah_transaksi,
      penjualan: acc.penjualan + r.total_penjualan,
      profit: acc.profit + r.gross_profit,
    }),
    { transaksi: 0, penjualan: 0, profit: 0 }
  );

  const monthLabel = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Penjualan</Text>
        <TouchableOpacity
          onPress={() => exportService.toExcel(data, 'Penjualan', 'laporan_penjualan')}
          disabled={data.length === 0}
        >
          <Ionicons name="download-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Month Picker */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => setMonthOffset((m) => m - 1)}>
          <Ionicons name="chevron-back" size={22} color="#6366F1" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setMonthOffset((m) => Math.min(m + 1, 0))}>
          <Ionicons name="chevron-forward" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Transaksi</Text>
          <Text style={styles.sumValue}>{totals.transaksi}</Text>
        </View>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Total Penjualan</Text>
          <Text style={[styles.sumValue, { fontSize: 13 }]}>{formatRupiah(totals.penjualan)}</Text>
        </View>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Gross Profit</Text>
          <Text style={[styles.sumValue, { fontSize: 13 }]}>{formatRupiah(totals.profit)}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={() => load(monthOffset)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => r.tanggal}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="Tidak ada data" message="Belum ada transaksi bulan ini" />}
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Tanggal</Text>
              <Text style={[styles.th, { flex: 1 }]}>Trx</Text>
              <Text style={[styles.th, { flex: 2 }]}>Penjualan</Text>
              <Text style={[styles.th, { flex: 2 }]}>Profit</Text>
              <Text style={[styles.th, { flex: 1 }]}>%</Text>
            </View>
          }
          renderItem={({ item: r }) => (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]}>{r.tanggal}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{r.jumlah_transaksi}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{formatRupiah(r.total_penjualan)}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{formatRupiah(r.gross_profit)}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{r.margin_persen}%</Text>
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
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: 12,
  },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#374151', minWidth: 150, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  sumCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, elevation: 1 },
  sumLabel: { fontSize: 11, color: '#6B7280' },
  sumValue: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#EEF2FF',
    borderRadius: 8, padding: 8, marginBottom: 4,
  },
  th: { fontSize: 11, fontWeight: '700', color: '#6366F1', textAlign: 'center' },
  tableRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 8, padding: 8, marginBottom: 4, elevation: 1,
  },
  td: { fontSize: 11, color: '#374151', textAlign: 'center' },
});
