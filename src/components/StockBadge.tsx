import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StockBadgeProps {
  stock: number;
  minStock: number;
  unit: string;
}

export default function StockBadge({ stock, minStock, unit }: StockBadgeProps) {
  const status = stock === 0 ? 'empty' : stock <= minStock ? 'low' : 'ok';
  return (
    <View style={[styles.badge, styles[status]]}>
      <Text style={[styles.text, styles[`${status}Text` as keyof typeof styles] as any]}>
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
