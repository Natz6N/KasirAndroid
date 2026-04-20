import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../utils/formatCurrency';
import StockBadge from './StockBadge';
import type { Product } from '../types/database';

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductListItem({ product, onEdit, onDelete }: ProductListItemProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.meta}>
          {product.barcode ?? 'No barcode'} · {product.sku ?? 'No SKU'}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.sellPrice}>{formatRupiah(product.sell_price)}</Text>
          <Text style={styles.buyPrice}>HPP: {formatRupiah(product.buy_price)}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <StockBadge
          stock={product.stock}
          minStock={product.min_stock}
          unit={product.unit}
        />
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onEdit(product)} hitSlop={8}>
            <Ionicons name="create-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(product)} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    gap: 8,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  priceRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  sellPrice: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  buyPrice: { fontSize: 12, color: '#6B7280' },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 14, marginTop: 4 },
});
