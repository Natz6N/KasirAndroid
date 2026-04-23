import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ProductRepository } from '../../../repositories/ProductRepository';
import EmptyState from '../../../components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductListItem from '../../../components/ProductListItem';
import { useProducts } from '../../../hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SPACING } from '../../../theme/colors';
import type { Product } from '../../../types/database';
import type { RootStackParamList } from '../../../types/navigation';

const productRepo = new ProductRepository();

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: products, isLoading, error, refetch } = useProducts(search);

  const handleDelete = (product: Product) => {
    Alert.alert('Hapus Produk', `Yakin ingin menghapus "${product.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await productRepo.softDelete(product.id);
          queryClient.invalidateQueries({ queryKey: ['products'] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Produk</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProductForm', {})} style={styles.headerBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={26} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
      ) : error ? (
        <EmptyState type="error" message="Gagal memuat produk" onRetry={refetch} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState 
              title="Belum ada produk" 
              message={search ? `Tidak ada hasil untuk "${search}"` : "Tap + untuk menambahkan produk baru"} 
            />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    elevation: 4,
  },
  headerBtn: { padding: SPACING.sm },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.surface },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: -SPACING.lg,
    marginBottom: SPACING.sm,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 50,
    gap: SPACING.sm,
    elevation: 4,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, paddingTop: SPACING.sm },
});
