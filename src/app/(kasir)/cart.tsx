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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Keranjang ({items.length})</Text>
        <TouchableOpacity onPress={handleClear} disabled={items.length === 0} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
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
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatRupiah(subtotal())}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Diskon Transaksi</Text>
            <TextInput
              style={styles.discountInput}
              value={discountInput}
              onChangeText={handleDiscountChange}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatRupiah(totalAmount())}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Payment')}
          >
            <Text style={styles.checkoutText}>Lanjut Pembayaran</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
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
  list: { paddingHorizontal: 12, paddingVertical: 8 },
  summary: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  discountInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
    minWidth: 100,
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  checkoutBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
