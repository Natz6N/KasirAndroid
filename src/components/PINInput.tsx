import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface PINInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  length?: number;
}

export default function PINInput({ value, onChange, onSubmit, length = 6 }: PINInputProps) {
  return (
    <View style={styles.container}>
      {/* Hidden input to capture keyboard */}
      <TextInput
        style={styles.hiddenInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="numeric"
        secureTextEntry
        maxLength={length}
        autoFocus
        onSubmitEditing={onSubmit}
      />
      {/* Visual dots */}
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View key={i} style={[styles.dot, value.length > i && styles.dotFilled]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },
  dots: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  dotFilled: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
});
