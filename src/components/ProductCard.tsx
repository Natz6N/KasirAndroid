import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../utils/formatCurrency';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
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
      activeOpacity={0.8}
      disabled={isOutOfStock}
    >
      {/* Product Image */}
      {product.image_uri ? (
        <Image source={{ uri: product.image_uri }} style={styles.productImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="cube-outline" size={32} color={COLORS.border} />
        </View>
      )}

      <View style={styles.cardInner}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>{formatRupiah(product.sell_price)}</Text>
        <View style={styles.divider} />
        <View style={styles.footer}>
          <View style={[styles.stockBadge, isLowStock && styles.stockBadgeLow, isOutOfStock && styles.stockBadgeEmpty]}>
            <Text
              style={[
                styles.stock,
                isLowStock && styles.stockLow,
                isOutOfStock && styles.stockEmpty,
              ]}
            >
              {isOutOfStock ? 'Habis' : `${product.stock} ${product.unit}`}
            </Text>
          </View>
          {product.category_name && (
            <Text style={styles.category} numberOfLines={1}>
              {product.category_name}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    elevation: 3,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInner: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  outOfStock: { opacity: 0.5 },
  name: { fontSize: 13, fontWeight: '700', color: COLORS.text, lineHeight: 18 },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  stockBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  stockBadgeLow: {
    backgroundColor: '#FEF3C7', // amber-100
  },
  stockBadgeEmpty: {
    backgroundColor: '#FEE2E2', // red-100
  },
  stock: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  stockLow: { color: COLORS.warning },
  stockEmpty: { color: COLORS.danger },
  category: { fontSize: 10, color: COLORS.textSecondary, maxWidth: '50%', fontStyle: 'italic' },
});
