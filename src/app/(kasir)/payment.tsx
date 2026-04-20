import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { TransactionService, StockInsufficientError } from '../../services/TransactionService';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { formatRupiah } from '../../utils/formatCurrency';
import NumberPad from '../../components/NumberPad';
import InvoiceReceipt from '../../components/InvoiceReceipt';
import type { CartItem, PaymentMethod } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

const txService = new TransactionService();

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Tunai', icon: 'cash-outline' },
  { key: 'qris', label: 'QRIS', icon: 'qr-code-outline' },
  { key: 'transfer', label: 'Transfer', icon: 'phone-portrait-outline' },
  { key: 'other', label: 'Lainnya', icon: 'ellipsis-horizontal-outline' },
];

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { items, discountAmount, subtotal, totalAmount, clear } = useCartStore(
    useShallow((s) => ({
      items: s.items,
      discountAmount: s.discountAmount,
      subtotal: s.subtotal,
      totalAmount: s.totalAmount,
      clear: s.clear,
    }))
  );
  const settings = useSettingsStore((s) => s.settings);
  const mode = useAuthStore((s) => s.mode);

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [payInput, setPayInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    invoiceNumber: string;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    paymentAmount: number;
    changeAmount: number;
  } | null>(null);

  const total = totalAmount();
  const payAmount = parseInt(payInput, 10) || 0;
  const change = method === 'cash' ? payAmount - total : 0;
  const canConfirm = method !== 'cash' || payAmount >= total;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      const actualPayAmount = method === 'cash' ? payAmount : total;
      const invoice = await txService.checkout({
        items,
        discount_amount: discountAmount,
        payment_method: method,
        payment_amount: actualPayAmount,
        cashier_name: settings?.store_name ?? 'Kasir',
      });
      setReceiptData({
        invoiceNumber: invoice,
        items: [...items],
        subtotal: subtotal(),
        discountAmount,
        totalAmount: total,
        paymentAmount: actualPayAmount,
        changeAmount: Math.max(0, change),
      });
      setInvoiceVisible(true);
    } catch (e) {
      if (e instanceof StockInsufficientError) {
        Alert.alert('Stok Tidak Cukup', e.message);
      } else {
        Alert.alert('Gagal', 'Terjadi kesalahan saat memproses transaksi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setInvoiceVisible(false);
    clear();
    const targetScreen = mode === 'admin' ? 'AdminTabs' : 'KasirTabs';
    navigation.reset({ index: 0, routes: [{ name: targetScreen }] });
  };

  const quickAmounts = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
    100000,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalAmount}>{formatRupiah(total)}</Text>
          {discountAmount > 0 && (
            <Text style={styles.discountNote}>Diskon: {formatRupiah(discountAmount)}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodCard, method === m.key && styles.methodCardActive]}
              onPress={() => setMethod(m.key)}
            >
              <Ionicons
                name={m.icon as any}
                size={24}
                color={method === m.key ? '#fff' : '#6366F1'}
              />
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {method === 'cash' && (
          <View style={styles.cashSection}>
            <Text style={styles.sectionTitle}>Uang Diterima</Text>
            <View style={styles.amountDisplay}>
              <Text style={styles.amountText}>
                {payInput ? formatRupiah(parseInt(payInput, 10) || 0) : 'Rp 0'}
              </Text>
            </View>
            {payAmount > 0 && (
              <View style={[styles.changeRow, change < 0 && styles.changeRowNegative]}>
                <Text style={styles.changeLabel}>Kembalian</Text>
                <Text style={[styles.changeValue, change < 0 && styles.changeNegative]}>
                  {formatRupiah(Math.max(0, change))}
                </Text>
              </View>
            )}
            <View style={styles.quickCash}>
              {quickAmounts.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={styles.quickBtn}
                  onPress={() => setPayInput(String(v))}
                >
                  <Text style={styles.quickBtnText}>{formatRupiah(v)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <NumberPad value={payInput} onChange={setPayInput} />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, (!canConfirm || loading) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.confirmText}>Konfirmasi Bayar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {receiptData && (
        <InvoiceReceipt
          visible={invoiceVisible}
          invoiceNumber={receiptData.invoiceNumber}
          items={receiptData.items}
          subtotal={receiptData.subtotal}
          discountAmount={receiptData.discountAmount}
          totalAmount={receiptData.totalAmount}
          paymentMethod={method}
          paymentAmount={receiptData.paymentAmount}
          changeAmount={receiptData.changeAmount}
          storeName={settings?.store_name ?? 'Omah Krupuk'}
          receiptNote={settings?.receipt_note ?? null}
          onClose={handleReceiptClose}
        />
      )}
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
    paddingTop: 48,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  body: { padding: 16, gap: 16, paddingBottom: 24 },
  totalCard: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: { color: '#C7D2FE', fontSize: 14 },
  totalAmount: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  discountNote: { color: '#C7D2FE', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  methodCard: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    gap: 6,
  },
  methodCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  methodLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },
  methodLabelActive: { color: '#fff' },
  cashSection: { gap: 10 },
  amountDisplay: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-end',
  },
  amountText: { fontSize: 24, fontWeight: '700', color: '#111827' },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
  },
  changeRowNegative: { backgroundColor: '#FEF2F2' },
  changeLabel: { fontSize: 14, color: '#374151' },
  changeValue: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
  changeNegative: { color: '#EF4444' },
  quickCash: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickBtnText: { color: '#6366F1', fontSize: 13, fontWeight: '600' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  confirmBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnDisabled: { backgroundColor: '#A5B4FC' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
