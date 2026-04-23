import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase } from '../../database/db';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatDisplayDateTime } from '../../utils/dateHelper';
import EmptyState from '../../components/EmptyState';
import type { PaymentMethod, TransactionItem } from '../../types/database';
import { printService } from '../../services/printService';
import { useSettingsStore } from '../../stores/settingsStore';

const txRepo = new TransactionRepository();

interface TransactionRow {
  id: number;
  invoice_number: string;
  status: string;
  payment_method: PaymentMethod;
  total_amount: number;
  transaction_date: string;
  cashier_name: string;
  item_count: number;
  note: string | null;
}

type FilterType = 'all' | 'completed' | 'cancelled';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Void' },
];

const METHOD_STYLE: Record<PaymentMethod, { bg: string; text: string; icon: string }> = {
  cash: { bg: '#FEF3C7', text: '#D97706', icon: 'cash-outline' },
  qris: { bg: '#EDE9FE', text: '#7C3AED', icon: 'qr-code-outline' },
  transfer: { bg: '#DBEAFE', text: '#1D4ED8', icon: 'phone-portrait-outline' },
  other: { bg: '#F3F4F6', text: '#6B7280', icon: 'ellipsis-horizontal-outline' },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  other: 'Lainnya',
};

export default function TransactionsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Detail modal
  const [detailTx, setDetailTx] = useState<TransactionRow | null>(null);
  const [detailItems, setDetailItems] = useState<TransactionItem[]>([]);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await getDatabase();
      const data = await db.getAllAsync<TransactionRow>(
        `SELECT t.id, t.invoice_number, t.status, t.payment_method,
                t.total_amount, t.transaction_date, t.cashier_name, t.note,
                COUNT(ti.id) AS item_count
         FROM transactions t
         LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
         GROUP BY t.id
         ORDER BY t.transaction_date DESC
         LIMIT 100`
      );
      setTransactions(data);
    } catch {
      setError('Gagal memuat riwayat transaksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openDetail = async (tx: TransactionRow) => {
    setDetailTx(tx);
    setVoidReason('');
    try {
      const items = await txRepo.getItems(tx.id);
      setDetailItems(items);
    } catch {
      setDetailItems([]);
    }
  };

  const handleVoid = () => {
    if (!detailTx) return;
    Alert.alert(
      'Void Transaksi',
      `Void transaksi ${detailTx.invoice_number}? Stok akan dikembalikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: async () => {
            setVoiding(true);
            try {
              await txRepo.voidTransaction(detailTx.id, voidReason.trim() || undefined);
              setDetailTx(null);
              await load();
              Alert.alert('Berhasil', 'Transaksi telah di-void dan stok dikembalikan.');
            } catch (e: any) {
              Alert.alert('Gagal', e.message ?? 'Tidak dapat void transaksi');
            } finally {
              setVoiding(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!detailTx || sharing) return;
    setSharing(true);
    try {
      const receiptData = printService.buildFromTransactionItems({
        invoiceNumber: detailTx.invoice_number,
        transactionDate: detailTx.transaction_date,
        items: detailItems,
        subtotal: detailTx.total_amount + (detailItems.reduce((s, i) => s + i.discount_per_item * i.quantity, 0)),
        discountAmount: 0,
        totalAmount: detailTx.total_amount,
        paymentMethod: detailTx.payment_method,
        paymentAmount: detailTx.total_amount,
        changeAmount: 0,
        storeName: settings?.store_name ?? 'Toko',
        storeAddress: settings?.store_address ?? null,
        storePhone: settings?.store_phone ?? null,
        receiptNote: settings?.receipt_note ?? null,
      });
      await printService.shareReceiptAsPDF(receiptData);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat membagikan struk');
    } finally {
      setSharing(false);
    }
  };

  const filtered = (() => {
    if (filter === 'completed') return transactions.filter((t) => t.status === 'completed');
    if (filter === 'cancelled') return transactions.filter((t) => t.status === 'cancelled');
    return transactions;
  })();

  const totals = filtered
    .filter((t) => t.status === 'completed')
    .reduce(
      (acc, t) => ({ count: acc.count + 1, amount: acc.amount + t.total_amount }),
      { count: 0, amount: 0 }
    );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Transaksi</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter chips */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(f) => f.key}
        contentContainerStyle={styles.filterRow}
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

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Total Transaksi</Text>
          <Text style={styles.sumValue}>{totals.count}</Text>
        </View>
        <View style={styles.sumCard}>
          <Text style={styles.sumLabel}>Total Pendapatan</Text>
          <Text style={[styles.sumValue, { fontSize: 14, color: '#6366F1' }]}>
            {formatRupiah(totals.amount)}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Tidak ada transaksi"
              message="Belum ada transaksi yang tercatat"
            />
          }
          renderItem={({ item: t }) => {
            const m = METHOD_STYLE[t.payment_method] ?? { bg: '#F3F4F6', text: '#6B7280', icon: 'receipt-outline' };
            const isVoided = t.status === 'cancelled';
            return (
              <TouchableOpacity
                style={[styles.txCard, isVoided && styles.txCardVoided]}
                onPress={() => openDetail(t)}
                activeOpacity={0.7}
              >
                <View style={[styles.txIcon, { backgroundColor: isVoided ? '#FEE2E2' : m.bg }]}>
                  <Ionicons name={isVoided ? 'close-circle-outline' : m.icon as any} size={20} color={isVoided ? '#DC2626' : m.text} />
                </View>

                <View style={styles.txBody}>
                  <View style={styles.txTopRow}>
                    <Text style={[styles.txInvoice, isVoided && { textDecorationLine: 'line-through', color: '#9CA3AF' }]} numberOfLines={1}>
                      {t.invoice_number}
                    </Text>
                    <View style={[styles.methodBadge, { backgroundColor: isVoided ? '#FEE2E2' : m.bg }]}>
                      <Text style={[styles.methodBadgeText, { color: isVoided ? '#DC2626' : m.text }]}>
                        {isVoided ? 'VOID' : METHOD_LABEL[t.payment_method] ?? t.payment_method}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.txMeta}>
                    {formatDisplayDateTime(t.transaction_date)} · {t.item_count} item
                  </Text>
                </View>

                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, isVoided && { color: '#9CA3AF', textDecorationLine: 'line-through' }]}>
                    {formatRupiah(t.total_amount)}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: isVoided ? '#DC2626' : '#22C55E' }]} />
                    <Text style={styles.statusText}>{isVoided ? 'Void' : 'Selesai'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!detailTx} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setDetailTx(null)} />
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />
            {detailTx && (
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.detailInvoice}>{detailTx.invoice_number}</Text>
                <Text style={styles.detailDate}>{formatDisplayDateTime(detailTx.transaction_date)}</Text>

                {detailTx.status === 'cancelled' && (
                  <View style={styles.voidBanner}>
                    <Ionicons name="close-circle" size={18} color="#DC2626" />
                    <Text style={styles.voidBannerText}>Transaksi ini telah di-void</Text>
                  </View>
                )}

                <Text style={styles.detailSection}>Item</Text>
                {detailItems.map((item) => (
                  <View key={item.id} style={styles.detailItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailItemName}>{item.product_name}</Text>
                      <Text style={styles.detailItemMeta}>{item.quantity}x @ {formatRupiah(item.unit_price)}</Text>
                    </View>
                    <Text style={styles.detailItemTotal}>{formatRupiah(item.subtotal)}</Text>
                  </View>
                ))}

                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total</Text>
                  <Text style={styles.detailValue}>{formatRupiah(detailTx.total_amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Metode</Text>
                  <Text style={styles.detailValue}>{METHOD_LABEL[detailTx.payment_method]}</Text>
                </View>

                {/* Void section */}
                {/* Share receipt button */}
                <TouchableOpacity
                  style={[shareStyles.shareBtn, sharing && shareStyles.btnDisabled]}
                  onPress={handleShare}
                  disabled={sharing}
                >
                  {sharing ? (
                    <ActivityIndicator color="#6366F1" size="small" />
                  ) : (
                    <Ionicons name="share-social-outline" size={18} color="#6366F1" />
                  )}
                  <Text style={shareStyles.shareBtnText}>
                    {sharing ? 'Menyiapkan...' : 'Bagikan Struk'}
                  </Text>
                </TouchableOpacity>

                {detailTx.status === 'completed' && (
                  <View style={styles.voidSection}>
                    <Text style={styles.detailSection}>Void Transaksi</Text>
                    <TextInput
                      style={styles.voidInput}
                      value={voidReason}
                      onChangeText={setVoidReason}
                      placeholder="Alasan void (opsional)"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={[styles.voidBtn, voiding && { opacity: 0.6 }]}
                      onPress={handleVoid}
                      disabled={voiding}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#fff" />
                      <Text style={styles.voidBtnText}>
                        {voiding ? 'Memproses...' : 'Void Transaksi'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeDetailBtn}
                  onPress={() => setDetailTx(null)}
                >
                  <Text style={styles.closeDetailText}>Tutup</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
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
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#6366F1' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginBottom: 4 },
  sumCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1 },
  sumLabel: { fontSize: 11, color: '#6B7280' },
  sumValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  list: { paddingHorizontal: 12, paddingVertical: 8 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  txCardVoided: {
    borderLeftColor: '#DC2626',
    opacity: 0.8,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: { flex: 1 },
  txTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  txInvoice: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  methodBadgeText: { fontSize: 10, fontWeight: '700' },
  txMeta: { fontSize: 11, color: '#6B7280' },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, color: '#6B7280' },
  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  dragHandle: {
    width: 48, height: 5, backgroundColor: '#D1D5DB',
    borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  detailInvoice: { fontSize: 18, fontWeight: '800', color: '#111827' },
  detailDate: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  voidBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginTop: 12,
  },
  voidBannerText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  detailSection: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  detailItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  detailItemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  detailItemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  detailItemTotal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  detailDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  voidSection: { marginTop: 16, gap: 8 },
  voidInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  voidBtn: {
    backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  voidBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeDetailBtn: {
    marginTop: 16, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  closeDetailText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});

const shareStyles = StyleSheet.create({
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  shareBtnText: { color: '#6366F1', fontSize: 14, fontWeight: '700' },
});