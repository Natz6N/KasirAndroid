import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StockBadgeProps {
  stock: number;
  minStock: number;
  unit: string;
}

export default function StockBadge({ stock, minStock, unit }: StockBadgeProps) {
  const isEmpty = stock === 0;
  const isLow = !isEmpty && stock <= minStock;
  return (
    <View style={[styles.badge, isEmpty ? styles.empty : isLow ? styles.low : styles.ok]}>
      <Text style={[styles.text, isEmpty ? styles.emptyText : isLow ? styles.lowText : styles.okText]}>
        {stock} {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 12, fontWeight: '700' },
  ok: { backgroundColor: '#DCFCE7' },
  okText: { color: '#16A34A' },
  low: { backgroundColor: '#FEF3C7' },
  lowText: { color: '#D97706' },
  empty: { backgroundColor: '#FEE2E2' },
  emptyText: { color: '#DC2626' },
});
