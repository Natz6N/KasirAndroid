import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../utils/formatCurrency';
import { COLORS, RADIUS, SPACING } from '../theme/colors';
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
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.unitPrice}>
          {formatRupiah(item.product.sell_price)} / {item.product.unit}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <View style={styles.qtyControl}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="remove" size={16} color={COLORS.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.qty}>{item.quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.subtotal}>{formatRupiah(item.subtotal)}</Text>
          <TouchableOpacity onPress={onRemove} hitSlop={12} style={styles.deleteBtn}>
            <Ionicons name="trash" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    gap: SPACING.sm,
  },
  info: { flex: 1, paddingRight: SPACING.sm },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2, lineHeight: 20 },
  unitPrice: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  rightSection: { alignItems: 'flex-end', gap: SPACING.sm },
  qtyControl: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qty: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
    color: COLORS.text,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  subtotal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  deleteBtn: {
    backgroundColor: '#FEE2E2', // red-100
    padding: 6,
    borderRadius: RADIUS.md,
  }
});
