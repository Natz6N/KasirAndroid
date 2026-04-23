import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductRepository } from '../../repositories/ProductRepository';
import { StockRepository } from '../../repositories/StockRepository';
import EmptyState from '../../components/EmptyState';
import NumberPad from '../../components/NumberPad';
import type { Product } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

const productRepo = new ProductRepository();
const stockRepo = new StockRepository();

type TabKey = 'all' | 'low' | 'empty';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'low', label: 'Menipis' },
  { key: 'empty', label: 'Habis' },
];

function getStatus(p: Product): 'ok' | 'low' | 'empty' {
  if (p.stock === 0) return 'empty';
  if (p.stock <= p.min_stock) return 'low';
  return 'ok';
}

const STATUS_CONFIG = {
  ok: { label: 'Aman', color: '#16A34A', bg: '#DCFCE7' },
  low: { label: 'Menipis', color: '#D97706', bg: '#FEF3C7' },
  empty: { label: 'Habis', color: '#DC2626', bg: '#FEE2E2' },
};

export default function StockManagementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('all');

  const [addTarget, setAddTarget] = useState<Product | null>(null);
  const [stockMode, setStockMode] = useState<'in' | 'out' | 'opname'>('in');
  const [stockInput, setStockInput] = useState('');
  const [noteInput, setNoteInput] = useState('Restok');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await productRepo.findAll());
    } catch {
      setError('Gagal memuat data stok');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = products.filter((p) => {
    const s = getStatus(p);
    if (tab === 'empty') return s === 'empty';
    if (tab === 'low') return s === 'low';
    return true;
  });

  const emptyCt = products.filter((p) => p.stock === 0).length;
  const lowCt = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length;

  const badgeCount: Record<TabKey, number> = { all: 0, low: lowCt, empty: emptyCt };

  const openModal = (product: Product, mode: 'in' | 'out' | 'opname' = 'in') => {
    setAddTarget(product);
    setStockMode(mode);
    setStockInput('');
    setNoteInput(mode === 'in' ? 'Restok' : mode === 'out' ? 'Stok keluar' : 'Opname');
  };

  const handleSave = async () => {
    if (!addTarget) return;
    const qty = parseInt(stockInput, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Error', 'Masukkan jumlah stok yang valid');
      return;
    }
    setSaving(true);
    try {
      const note = noteInput.trim() || (stockMode === 'in' ? 'Tambah stok' : stockMode === 'out' ? 'Stok keluar' : 'Opname');
      if (stockMode === 'in') {
        await stockRepo.addStock(addTarget.id, qty, note);
      } else if (stockMode === 'out') {
        await stockRepo.removeStock(addTarget.id, qty, note);
      } else {
        // opname: qty is the actual stock count
        await stockRepo.adjustStock(addTarget.id, qty, note);
      }
      setAddTarget(null);
      await load();
    } catch (e: any) {
      Alert.alert('Gagal', e.message ?? 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Stok</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
            {badgeCount[t.key] > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: t.key === 'empty' ? '#EF4444' : '#F59E0B' },
                ]}
              >
                <Text style={styles.tabBadgeText}>{badgeCount[t.key]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="Tidak ada produk" message="Tidak ada produk dalam kategori ini" />
          }
          renderItem={({ item: p }) => {
            const status = getStatus(p);
            const cfg = STATUS_CONFIG[status];
            const maxStock = Math.max(p.stock, p.min_stock * 3, 1);
            const pct = Math.min(100, (p.stock / maxStock) * 100);
            const barColor =
              status === 'empty' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#6366F1';

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.productMeta}>
                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                    {p.category_name ? (
                      <View style={styles.catChip}>
                        <Text style={styles.catChipText}>{p.category_name}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressLabels}>
                    <Text style={styles.stockLabel}>
                      Stok: <Text style={{ fontWeight: '700', color: '#111827' }}>{p.stock}</Text> {p.unit}
                    </Text>
                    <Text style={styles.minLabel}>Min. {p.min_stock}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.addBtn} onPress={() => openModal(p, 'in')}>
                    <Ionicons name="add-circle-outline" size={16} color="#6366F1" />
                    <Text style={styles.addBtnText}>Masuk</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => openModal(p, 'out')}>
                    <Ionicons name="remove-circle-outline" size={16} color="#DC2626" />
                    <Text style={[styles.addBtnText, { color: '#DC2626' }]}>Keluar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => openModal(p, 'opname')}>
                    <Ionicons name="clipboard-outline" size={16} color="#D97706" />
                    <Text style={[styles.addBtnText, { color: '#D97706' }]}>Opname</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.historyBtn}
                  onPress={() => navigation.navigate('StockHistory', { productId: p.id, productName: p.name })}
                >
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.historyBtnText}>Riwayat</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Add Stock Bottom Sheet */}
      <Modal visible={!!addTarget} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setAddTarget(null)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheet}
          >
            <View style={styles.dragHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {stockMode === 'in' ? 'Stok Masuk' : stockMode === 'out' ? 'Stok Keluar' : 'Penyesuaian (Opname)'}
                </Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {addTarget?.name}
                </Text>
              </View>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setAddTarget(null)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {addTarget && (
              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>Stok Saat Ini</Text>
                <Text style={styles.currentValue}>
                  {addTarget.stock} {addTarget.unit}
                </Text>
              </View>
            )}

            <View style={styles.amountBox}>
              <Text style={styles.amountCaption}>
                {stockMode === 'in' ? 'Jumlah Tambah' : stockMode === 'out' ? 'Jumlah Kurang' : 'Stok Aktual'}
              </Text>
              <Text style={[styles.amountText, stockMode === 'out' && { color: '#DC2626' }, stockMode === 'opname' && { color: '#D97706' }]}>
                {stockInput
                  ? stockMode === 'in' ? `+${stockInput} ${addTarget?.unit ?? ''}` 
                    : stockMode === 'out' ? `-${stockInput} ${addTarget?.unit ?? ''}`
                    : `${stockInput} ${addTarget?.unit ?? ''}`
                  : '—'}
              </Text>
            </View>

            <TextInput
              style={styles.noteInput}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Catatan (misal: restok, retur)"
              placeholderTextColor="#9CA3AF"
            />

            <NumberPad value={stockInput} onChange={setStockInput} />

            <TouchableOpacity
              style={[styles.saveBtn, (!stockInput || saving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!stockInput || saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Menyimpan...' : stockMode === 'in' ? 'Simpan Stok Masuk' : stockMode === 'out' ? 'Simpan Stok Keluar' : 'Simpan Penyesuaian'}
              </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 13, color: '#6B7280' },
  tabTextActive: { color: '#6366F1', fontWeight: '700' },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    elevation: 1,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productMeta: { flex: 1, marginRight: 8 },
  productName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  catChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  catChipText: { fontSize: 11, color: '#6366F1', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  progressSection: { gap: 6 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  stockLabel: { fontSize: 13, color: '#374151' },
  minLabel: { fontSize: 11, color: '#9CA3AF' },
  progressTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  cardActions: { flexDirection: 'row', gap: 8 },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 10,
  },
  addBtnText: { fontSize: 14, color: '#6366F1', fontWeight: '600' },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  historyBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  // Modal
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
  },
  dragHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sheetSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2, maxWidth: 220 },
  sheetClose: { backgroundColor: '#F3F4F6', borderRadius: 20, padding: 8 },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  currentLabel: { fontSize: 13, color: '#6B7280' },
  currentValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  amountBox: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  amountCaption: { fontSize: 12, color: '#9CA3AF' },
  amountText: { fontSize: 28, fontWeight: '700', color: '#6366F1', marginTop: 4 },
  noteInput: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  saveBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#A5B4FC' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
