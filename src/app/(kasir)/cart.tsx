import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useCartStore } from '../../stores/cartStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { formatRupiah } from '../../utils/formatCurrency';
import CartItemCard from '../../components/CartItemCard';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import type { CartItem } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    items,
    updateQuantity,
    removeItem,
    subtotal,
    totalAmount,
    discountAmount,
    setTransactionDiscount,
    clear,
  } = useCartStore(
    useShallow((s) => ({
      items: s.items,
      updateQuantity: s.updateQuantity,
      removeItem: s.removeItem,
      subtotal: s.subtotal,
      totalAmount: s.totalAmount,
      discountAmount: s.discountAmount,
      setTransactionDiscount: s.setTransactionDiscount,
      clear: s.clear,
    }))
  );
  const [discountInput, setDiscountInput] = useState(String(discountAmount));

  const handleDiscountChange = (val: string) => {
    setDiscountInput(val);
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    setTransactionDiscount(num);
  };

  const handleClear = () => {
    Alert.alert('Hapus Semua', 'Kosongkan keranjang?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: clear },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Keranjang ({items.length})</Text>
        <TouchableOpacity onPress={handleClear} disabled={items.length === 0} hitSlop={8} style={[styles.headerBtn, items.length === 0 && { opacity: 0.5 }]}>
          <Ionicons name="trash-outline" size={22} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.product.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="Keranjang Kosong"
            message="Tambahkan produk dari layar kasir"
          />
        }
        renderItem={({ item }: { item: CartItem }) => (
          <CartItemCard
            item={item}
            onIncrease={() => updateQuantity(item.product.id, item.quantity + 1)}
            onDecrease={() => updateQuantity(item.product.id, item.quantity - 1)}
            onRemove={() => removeItem(item.product.id)}
          />
        )}
      />

      {items.length > 0 && (
        <View style={[styles.summary, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatRupiah(subtotal())}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Diskon Transaksi</Text>
            <View style={styles.discountInputWrapper}>
              <Text style={styles.discountPrefix}>Rp</Text>
              <TextInput
                style={styles.discountInput}
                value={discountInput}
                onChangeText={handleDiscountChange}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatRupiah(totalAmount())}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Payment')}
            activeOpacity={0.9}
          >
            <Text style={styles.checkoutText}>Lanjut Pembayaran</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
          </TouchableOpacity>
        </View>
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
  headerBtn: {
    padding: SPACING.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.surface },
  list: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, paddingBottom: 20 },
  summary: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  discountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    width: 120,
  },
  discountPrefix: { fontSize: 14, color: COLORS.textSecondary, marginRight: 4 },
  discountInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'right',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  totalRow: {
    marginBottom: SPACING.sm,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  checkoutText: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },
});
