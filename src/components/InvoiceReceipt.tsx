import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { printService } from '../services/printService';
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
  storeAddress?: string | null;
  storePhone?: string | null;
  receiptNote?: string | null;
  onClose: () => void;
  onNewTransaction?: () => void;
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
  storeAddress,
  storePhone,
  receiptNote,
  onClose,
  onNewTransaction,
}: InvoiceReceiptProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await printService.shareReceiptAsPDF({
        invoiceNumber,
        transactionDate: new Date().toISOString(),
        items,
        subtotal,
        discountAmount,
        totalAmount,
        paymentMethod,
        paymentAmount,
        changeAmount,
        storeName,
        storeAddress,
        storePhone,
        receiptNote,
      });
    } catch {
      Alert.alert('Gagal', 'Tidak dapat membagikan struk.');
    } finally {
      setSharing(false);
    }
  };

  const handleNewTransaction = () => {
    onNewTransaction?.();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Success indicator */}
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
            <Text style={styles.successText}>Transaksi Berhasil!</Text>
          </View>

          {/* Header */}
          <Text style={styles.storeName}>{storeName}</Text>
          {storeAddress ? <Text style={styles.storeMeta}>{storeAddress}</Text> : null}
          {storePhone ? <Text style={styles.storeMeta}>Telp: {storePhone}</Text> : null}
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
                    {item.quantity} x {formatRupiah(item.product.sell_price)}
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

          <View style={styles.divider} />

          {/* Share button */}
          <TouchableOpacity
            style={[styles.shareBtn, sharing && styles.btnDisabled]}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
          >
            {sharing ? (
              <ActivityIndicator color="#6366F1" size="small" />
            ) : (
              <Ionicons name="share-social-outline" size={20} color="#6366F1" />
            )}
            <Text style={styles.shareBtnText}>
              {sharing ? 'Menyiapkan PDF...' : 'Bagikan Struk'}
            </Text>
          </TouchableOpacity>

          {/* Bottom action buttons */}
          <View style={styles.bottomRow}>
            {onNewTransaction ? (
              <>
                <TouchableOpacity
                  style={styles.newTxBtn}
                  onPress={handleNewTransaction}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.newTxBtnText}>Transaksi Baru</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.doneBtnText}>Selesai</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.newTxBtn} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.newTxBtnText}>Selesai</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  successText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
  },
  storeMeta: {
    fontSize: 12,
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 2,
  },
  invoiceNo: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 4,
  },
  dateTime: {
    fontSize: 12,
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  items: { maxHeight: 200 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  itemQty: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  itemSubtotal: { fontSize: 13, fontWeight: '600', color: '#374151' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#374151' },
  totalRow: { paddingVertical: 6 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#6366F1' },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
    marginBottom: 10,
  },
  btnDisabled: { opacity: 0.6 },
  shareBtnText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  newTxBtn: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
  },
  newTxBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  doneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
});