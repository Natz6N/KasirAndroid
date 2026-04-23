import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

interface CategoryChipProps {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}

export default function CategoryChip({ label, active, color, onPress }: CategoryChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && { backgroundColor: color ?? COLORS.primary },
        !active && styles.chipInactive
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginRight: SPACING.xs,
  },
  chipInactive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  text: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  textActive: { color: COLORS.surface, fontWeight: '700' },
});
