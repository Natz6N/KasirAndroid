import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatRupiah } from '../utils/formatCurrency';
import type { Product } from '../types/database';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= product.min_stock;

  return (
    <TouchableOpacity
      style={[styles.card, isOutOfStock && styles.outOfStock]}
      onPress={() => onPress(product)}
      activeOpacity={0.75}
      disabled={isOutOfStock}
    >
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.price}>{formatRupiah(product.sell_price)}</Text>
      <View style={styles.footer}>
        <Text
          style={[
            styles.stock,
            isLowStock && styles.stockLow,
            isOutOfStock && styles.stockEmpty,
          ]}
        >
          {isOutOfStock ? 'Habis' : `${product.stock} ${product.unit}`}
        </Text>
        {product.category_name && (
          <Text style={styles.category} numberOfLines={1}>
            {product.category_name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    gap: 4,
  },
  outOfStock: { opacity: 0.45 },
  name: { fontSize: 13, fontWeight: '600', color: '#111827' },
  price: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  stock: { fontSize: 11, color: '#6B7280' },
  stockLow: { color: '#F59E0B', fontWeight: '600' },
  stockEmpty: { color: '#EF4444', fontWeight: '700' },
  category: { fontSize: 10, color: '#9CA3AF', maxWidth: '50%' },
});
