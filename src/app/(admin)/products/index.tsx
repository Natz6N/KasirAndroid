import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ProductRepository } from '../../../repositories/ProductRepository';
import EmptyState from '../../../components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductListItem from '../../../components/ProductListItem';
import type { Product } from '../../../types/database';
import type { RootStackParamList } from '../../../types/navigation';

const productRepo = new ProductRepository();

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (search.trim()) {
        setProducts(await productRepo.search(search.trim()));
      } else {
        setProducts(await productRepo.findAll());
      }
    } catch {
      setError('Gagal memuat produk');
    }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = (product: Product) => {
    Alert.alert('Hapus Produk', `Hapus "${product.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await productRepo.softDelete(product.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Produk</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProductForm', {})}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari produk..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {error ? (
        <EmptyState type="error" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="Belum ada produk" message="Tap + untuk menambahkan produk baru" />
          }
          renderItem={({ item: p }) => (
            <ProductListItem
              product={p}
              onEdit={() => navigation.navigate('ProductForm', { productId: p.id })}
              onDelete={() => handleDelete(p)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
});
