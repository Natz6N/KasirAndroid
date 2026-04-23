import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../utils/formatCurrency';
import { formatDisplayDateTime } from '../utils/dateHelper';
import type { CartItem, PaymentMethod } from '../types/database';

interface InvoiceReceiptProps {
  visible: boolean;
  invoiceNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  changeAmount: number;
  storeName: string;
  receiptNote?: string | null;
  onClose: () => void;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  other: 'Lainnya',
};

export default function InvoiceReceipt({
  visible,
  invoiceNumber,
  items,
  subtotal,
  discountAmount,
  totalAmount,
  paymentMethod,
  paymentAmount,
  changeAmount,
  storeName,
  receiptNote,
  onClose,
}: InvoiceReceiptProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.invoiceNo}>{invoiceNumber}</Text>
          <Text style={styles.dateTime}>{formatDisplayDateTime(new Date().toISOString())}</Text>

          <View style={styles.divider} />

          {/* Items */}
          <ScrollView style={styles.items} showsVerticalScrollIndicator={false}>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemQty}>
                    {item.quantity} × {formatRupiah(item.product.sell_price)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>{formatRupiah(item.subtotal)}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatRupiah(subtotal)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Diskon</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                -{formatRupiah(discountAmount)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatRupiah(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{METHOD_LABELS[paymentMethod]}</Text>
            <Text style={styles.summaryValue}>{formatRupiah(paymentAmount)}</Text>
          </View>
          {paymentMethod === 'cash' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kembalian</Text>
              <Text style={[styles.summaryValue, { color: '#22C55E', fontWeight: '700' }]}>
                {formatRupiah(changeAmount)}
              </Text>
            </View>
          )}

          {receiptNote && (
            <>
              <View style={styles.divider} />
              <Text style={styles.note}>{receiptNote}</Text>
            </>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.closeBtnText}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  storeName: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: '#111827' },
  invoiceNo: { fontSize: 12, textAlign: 'center', color: '#6B7280', marginTop: 2 },
  dateTime: { fontSize: 12, textAlign: 'center', color: '#9CA3AF' },
  divider: { borderBottomWidth: 1, borderColor: '#E5E7EB', marginVertical: 12 },
  items: { maxHeight: 200 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 13, fontWeight: '500', color: '#111827' },
  itemQty: { fontSize: 11, color: '#6B7280' },
  itemSubtotal: { fontSize: 13, fontWeight: '600', color: '#374151' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#374151' },
  totalRow: { paddingVertical: 6 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  note: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 },
  closeBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
