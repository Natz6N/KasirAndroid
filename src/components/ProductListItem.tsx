import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../utils/formatCurrency';
import StockBadge from './StockBadge';
import { COLORS, RADIUS, SPACING } from '../theme/colors';
import type { Product } from '../types/database';

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductListItem({ product, onEdit, onDelete }: ProductListItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.meta}>
          {product.barcode ?? 'No barcode'} · {product.sku ?? 'No SKU'}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.sellPrice}>{formatRupiah(product.sell_price)}</Text>
          <View style={styles.buyPriceBadge}>
            <Text style={styles.buyPrice}>HPP: {formatRupiah(product.buy_price)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.right}>
        <StockBadge
          stock={product.stock}
          minStock={product.min_stock}
          unit={product.unit}
        />
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onEdit(product)} hitSlop={12} style={styles.actionBtn}>
            <Ionicons name="create" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(product)} hitSlop={12} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="trash" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  meta: { fontSize: 11, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sellPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  buyPriceBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  buyPrice: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionBtn: {
    backgroundColor: COLORS.primaryLight + '40', // slightly transparent
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
