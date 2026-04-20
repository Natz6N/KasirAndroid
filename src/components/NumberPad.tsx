import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'] as const;

export default function NumberPad({ value, onChange, maxLength = 12 }: NumberPadProps) {
  const handleKey = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (key === '000') {
      const next = value + '000';
      if (next.length <= maxLength) onChange(next);
    } else {
      const next = value === '0' ? key : value + key;
      if (next.length <= maxLength) onChange(next);
    }
  };

  return (
    <View style={styles.pad}>
      {KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          style={[styles.key, key === 'del' && styles.delKey]}
          onPress={() => handleKey(key)}
          activeOpacity={0.6}
        >
          {key === 'del' ? (
            <Ionicons name="backspace-outline" size={22} color="#374151" />
          ) : (
            <Text style={styles.keyText}>{key}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.33%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  delKey: { backgroundColor: '#FEF2F2' },
  keyText: { fontSize: 20, fontWeight: '600', color: '#111827' },
});
