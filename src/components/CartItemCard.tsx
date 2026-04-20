import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../utils/formatCurrency';
import type { CartItem } from '../types/database';

interface CartItemCardProps {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export default function CartItemCard({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: CartItemCardProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text style={styles.unitPrice}>
          {formatRupiah(item.product.sell_price)} / {item.product.unit}
        </Text>
      </View>
      <View style={styles.qtyControl}>
        <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease} hitSlop={6}>
          <Ionicons name="remove" size={16} color="#6366F1" />
        </TouchableOpacity>
        <Text style={styles.qty}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease} hitSlop={6}>
          <Ionicons name="add" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>
      <View style={styles.right}>
        <Text style={styles.subtotal}>{formatRupiah(item.subtotal)}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    gap: 8,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  unitPrice: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 6,
    padding: 5,
  },
  qty: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'center',
    color: '#111827',
  },
  right: { alignItems: 'flex-end', gap: 6 },
  subtotal: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
});
