import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  type?: 'empty' | 'error';
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function EmptyState({
  type = 'empty',
  title,
  message,
  onRetry,
}: EmptyStateProps) {
  const isError = type === 'error';
  return (
    <View style={styles.container}>
      <Ionicons
        name={isError ? 'alert-circle-outline' : 'search-outline'}
        size={56}
        color={isError ? '#FCA5A5' : '#D1D5DB'}
      />
      <Text style={styles.title}>
        {title ?? (isError ? 'Terjadi Kesalahan' : 'Data Kosong')}
      </Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color="#6366F1" />
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  message: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  retryText: { color: '#6366F1', fontWeight: '600', fontSize: 14 },
});
