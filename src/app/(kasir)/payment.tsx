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
import { useSettingsStore } from '../../stores/settingsStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { formatRupiah } from '../../utils/formatCurrency';
import NumberPad from '../../components/NumberPad';
import InvoiceReceipt from '../../components/InvoiceReceipt';
import { COLORS, RADIUS, SPACING } from '../../theme/colors';
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
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] });
  };

  const quickAmounts = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
    100000,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalAmount}>{formatRupiah(total)}</Text>
          {discountAmount > 0 && (
            <Text style={styles.discountNote}>Diskon Transaksi: {formatRupiah(discountAmount)}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodCard, method === m.key && styles.methodCardActive]}
              onPress={() => setMethod(m.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, method === m.key && styles.iconWrapperActive]}>
                <Ionicons
                  name={m.icon as any}
                  size={22}
                  color={method === m.key ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
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
              <Text style={[styles.amountText, payInput ? { color: COLORS.text } : { color: COLORS.textSecondary }]}>
                {payInput ? formatRupiah(parseInt(payInput, 10) || 0) : 'Rp 0'}
              </Text>
            </View>

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

            {payAmount > 0 && (
              <View style={[styles.changeRow, change < 0 && styles.changeRowNegative]}>
                <Text style={styles.changeLabel}>{change < 0 ? 'Kurang' : 'Kembalian'}</Text>
                <Text style={[styles.changeValue, change < 0 && styles.changeNegative]}>
                  {formatRupiah(Math.abs(change))}
                </Text>
              </View>
            )}

            <View style={styles.numpadContainer}>
              <NumberPad value={payInput} onChange={setPayInput} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, (!canConfirm || loading) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.surface} />
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
          storeAddress={settings?.store_address ?? null}
          storePhone={settings?.store_phone ?? null}
          receiptNote={settings?.receipt_note ?? null}
          onClose={handleReceiptClose}
          onNewTransaction={() => {
            setInvoiceVisible(false);
            clear();
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] });
          }}
        />
      )}
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  headerBtn: { padding: SPACING.sm },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.surface },
  body: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },
  totalCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  totalLabel: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
  totalAmount: { color: COLORS.surface, fontSize: 36, fontWeight: '800', marginTop: SPACING.xs },
  discountNote: {
    color: COLORS.primaryLight,
    fontSize: 12,
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: -SPACING.sm },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  methodCard: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    elevation: 1,
  },
  methodCardActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
    elevation: 4,
  },
  iconWrapper: {
    backgroundColor: COLORS.background,
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: COLORS.surface,
  },
  methodLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  methodLabelActive: { color: COLORS.surface },
  cashSection: { gap: SPACING.md, marginTop: SPACING.xs },
  amountDisplay: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'flex-end',
    elevation: 2,
  },
  amountText: { fontSize: 28, fontWeight: '800' },
  quickCash: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
  },
  quickBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    elevation: 1,
  },
  changeRowNegative: { borderLeftColor: COLORS.danger },
  changeLabel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  changeValue: { fontSize: 18, fontWeight: '800', color: COLORS.success },
  changeNegative: { color: COLORS.danger },
  numpadContainer: { marginTop: SPACING.sm },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    elevation: 4,
  },
  confirmBtnDisabled: { backgroundColor: COLORS.primaryLight, elevation: 0 },
  confirmText: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },
});