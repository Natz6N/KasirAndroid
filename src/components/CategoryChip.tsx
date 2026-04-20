import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface CategoryChipProps {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}

export default function CategoryChip({ label, active, color, onPress }: CategoryChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color ?? '#6366F1' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  text: { fontSize: 13, color: '#374151' },
  textActive: { color: '#fff', fontWeight: '600' },
});
