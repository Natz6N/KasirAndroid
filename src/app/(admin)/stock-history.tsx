import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StockRepository } from '../../repositories/StockRepository';
import EmptyState from '../../components/EmptyState';
import { formatDisplayDate } from '../../utils/dateHelper';
import type { StockMovement, StockMovementType } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

const stockRepo = new StockRepository();

type FilterKey = 'all' | StockMovementType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'in', label: 'Masuk' },
  { key: 'out', label: 'Keluar' },
  { key: 'adjustment', label: 'Penyesuaian' },
  { key: 'return', label: 'Retur' },
];

const TYPE_CONFIG: Record<StockMovementType, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  valueColor: string;
  prefix: string;
}> = {
  in:         { label: 'Masuk',       icon: 'arrow-up',       iconBg: '#D1FAE5', iconColor: '#059669', badgeBg: '#D1FAE5', badgeText: '#065F46', valueColor: '#059669', prefix: '+' },
  out:        { label: 'Keluar',      icon: 'arrow-down',     iconBg: '#FEE2E2', iconColor: '#DC2626', badgeBg: '#FEE2E2', badgeText: '#7F1D1D', valueColor: '#DC2626', prefix: '-' },
  adjustment: { label: 'Penyesuaian', icon: 'swap-horizontal', iconBg: '#DBEAFE', iconColor: '#2563EB', badgeBg: '#DBEAFE', badgeText: '#1E3A8A', valueColor: '#2563EB', prefix: '' },
  return:     { label: 'Retur',       icon: 'return-up-back', iconBg: '#FEF3C7', iconColor: '#D97706', badgeBg: '#FEF3C7', badgeText: '#78350F', valueColor: '#D97706', prefix: '+' },
};

interface Section {
  title: string;
  data: StockMovement[];
}

function groupByDate(movements: StockMovement[]): Section[] {
  const map = new Map<string, StockMovement[]>();
  const todayKey = formatDisplayDate(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = formatDisplayDate(yesterdayDate.toISOString());

  for (const m of movements) {
    const key = formatDisplayDate(m.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  const sections: Section[] = [];
  for (const [key, data] of map) {
    let title = key;
    if (key === todayKey) title = 'Hari Ini';
    else if (key === yesterdayKey) title = 'Kemarin';
    sections.push({ title, data });
  }
  return sections;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StockHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'StockHistory'>>();
  const { productId, productName } = route.params;

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMovements(await stockRepo.getMovementsByProduct(productId, 200));
    } catch {
      setError('Gagal memuat riwayat stok');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'all' ? movements : movements.filter((m) => m.type === filter);
  const sections = groupByDate(filtered);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Riwayat Stok</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{productName}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={load} />
      ) : sections.length === 0 ? (
        <EmptyState title="Tidak ada riwayat" message="Belum ada pergerakan stok untuk produk ini" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item: m }) => {
            const cfg = TYPE_CONFIG[m.type];
            const diff = m.stock_after - m.stock_before;
            const displayQty = m.type === 'adjustment'
              ? (diff >= 0 ? `+${Math.abs(diff)}` : `-${Math.abs(diff)}`)
              : `${cfg.prefix}${m.quantity}`;
            const adjustColor = diff >= 0 ? '#2563EB' : '#DC2626';

            return (
              <View style={styles.card}>
                <View style={[styles.iconCircle, { backgroundColor: cfg.iconBg }]}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
                      <Text style={[styles.badgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatTime(m.created_at)}</Text>
                  </View>
                  {m.note ? (
                    <Text style={styles.noteText} numberOfLines={1}>{m.note}</Text>
                  ) : null}
                </View>
                <View style={styles.valueBox}>
                  <Text style={[styles.qtyText, { color: m.type === 'adjustment' ? adjustColor : cfg.valueColor }]}>
                    {displayQty}
                  </Text>
                  <Text style={styles.rangeText}>
                    {m.stock_before} → {m.stock_after}
                  </Text>
                </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  filterRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  chipActive: { backgroundColor: '#6366F1' },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  list: { padding: 12, gap: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeText: { fontSize: 11, color: '#9CA3AF' },
  noteText: { fontSize: 12, color: '#6B7280' },
  valueBox: { alignItems: 'flex-end', gap: 2 },
  qtyText: { fontSize: 18, fontWeight: '700' },
  rangeText: { fontSize: 11, color: '#9CA3AF' },
});
