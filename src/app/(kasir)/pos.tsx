import React, { useCallback, useEffect, useState } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ProductRepository } from '../../repositories/ProductRepository';
import { CategoryRepository } from '../../repositories/CategoryRepository';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { formatRupiah } from '../../utils/formatCurrency';
import ProductCard from '../../components/ProductCard';
import CategoryChip from '../../components/CategoryChip';
import EmptyState from '../../components/EmptyState';
import BarcodeScanner from '../../components/BarcodeScanner';
import type { Category, Product } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

const productRepo = new ProductRepository();
const categoryRepo = new CategoryRepository();

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { addItem, items, totalAmount } = useCartStore(
    useShallow((s) => ({ addItem: s.addItem, items: s.items, totalAmount: s.totalAmount }))
  );
  const mode = useAuthStore((s) => s.mode);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: Product[];
      if (search.trim()) {
        data = await productRepo.search(search.trim());
      } else if (selectedCategory !== null) {
        data = await productRepo.findByCategory(selectedCategory);
      } else {
        data = await productRepo.findAll();
      }
      setProducts(data);
    } catch {
      setError('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    categoryRepo.findAll().then(setCategories).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  useEffect(() => {
    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) {
      Alert.alert('Stok Habis', `${product.name} sudah habis`);
      return;
    }
    const inCart = items.find((i) => i.product.id === product.id);
    if (inCart && inCart.quantity >= product.stock) {
      Alert.alert('Stok Kurang', `Stok ${product.name} hanya ${product.stock}`);
      return;
    }
    addItem(product);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setScannerVisible(false);
    const product = await productRepo.findByBarcode(barcode);
    if (!product) {
      Alert.alert('Tidak Ditemukan', `Produk dengan barcode ${barcode} tidak ada`);
      return;
    }
    handleAddToCart(product);
  };

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Omah Krupuk</Text>
        <View style={styles.headerRight}>
          {mode === 'kasir' ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('AdminPIN')}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#6366F1" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('AdminTabs')}
            >
              <Ionicons name="grid-outline" size={20} color="#6366F1" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.cartBtn, cartCount === 0 && { opacity: 0.5 }]}
            onPress={() => navigation.navigate('Cart')}
            disabled={cartCount === 0}
          >
            <Ionicons name="cart-outline" size={24} color="#fff" />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + Scan */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau SKU..."
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerVisible(true)}
        >
          <Ionicons name="barcode-outline" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <FlatList
        data={[{ id: null, name: 'Semua', color_hex: '#6366F1' } as any, ...categories]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => String(c.id ?? 'all')}
        contentContainerStyle={styles.catList}
        renderItem={({ item: cat }) => (
          <CategoryChip
            label={cat.name}
            active={selectedCategory === cat.id}
            color={cat.color_hex}
            onPress={() => setSelectedCategory(cat.id)}
          />
        )}
      />

      {/* Product Grid */}
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#6366F1" size="large" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={loadProducts} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.productGrid}
          ListEmptyComponent={
            <EmptyState
              title="Produk tidak ditemukan"
              message={search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada produk aktif'}
            />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={handleAddToCart} />
          )}
        />
      )}

      {/* Cart Summary Bar */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartBarText}>{cartCount} item</Text>
          <Text style={styles.cartBarTotal}>{formatRupiah(totalAmount())}</Text>
          <Text style={styles.cartBarAction}>Lihat Keranjang →</Text>
        </TouchableOpacity>
      )}

      <BarcodeScanner
        visible={scannerVisible}
        onScanned={handleBarcodeScanned}
        onClose={() => setScannerVisible(false)}
      />
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
    paddingTop: 48,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { backgroundColor: '#fff', borderRadius: 8, padding: 6 },
  cartBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 6,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  scanBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 10,
  },
  catList: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  loader: { marginTop: 60 },
  productGrid: { paddingHorizontal: 6, paddingBottom: 80 },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cartBarText: { color: '#fff', fontSize: 13 },
  cartBarTotal: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cartBarAction: { color: '#C7D2FE', fontSize: 13 },
});
