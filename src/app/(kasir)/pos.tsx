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
import { useCartStore } from '../../stores/cartStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { formatRupiah } from '../../utils/formatCurrency';
import ProductCard from '../../components/ProductCard';
import CategoryChip from '../../components/CategoryChip';
import EmptyState from '../../components/EmptyState';
import BarcodeScanner from '../../components/BarcodeScanner';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import type { Category, Product } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';
import { ProductRepository } from '../../repositories/ProductRepository';

const productRepo = new ProductRepository();

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { addItem, items, totalAmount } = useCartStore(
    useShallow((s) => ({ addItem: s.addItem, items: s.items, totalAmount: s.totalAmount }))
  );
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  // TanStack Query Hooks
  const { data: products, isLoading, error, refetch } = useProducts(search, selectedCategory);

  const { data: categories = [] } = useCategories();

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
      {/* Header with glassmorphism-like feel */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.lg }]}>
        <View>
          <Text style={styles.headerGreeting}>Halo,</Text>
          <Text style={styles.headerTitle}>Kasir Aktif</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.cartBtn, cartCount === 0 && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Cart')}
            disabled={cartCount === 0}
          >
            <Ionicons name="cart" size={24} color={COLORS.surface} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + Scan */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk atau SKU..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerVisible(true)}
        >
          <Ionicons name="barcode-outline" size={24} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View>
        <FlatList
          data={[{ id: null, name: 'Semua', color_hex: COLORS.primary } as any, ...categories]}
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
      </View>

      {/* Product Grid */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
      ) : error ? (
        <EmptyState type="error" message="Gagal memuat produk" onRetry={refetch} />
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
        <View style={styles.cartBarWrapper}>
          <TouchableOpacity
            style={styles.cartBar}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.9}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarIcon}>
                <Ionicons name="cart" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.cartBarText}>{cartCount} item</Text>
                <Text style={styles.cartBarTotal}>{formatRupiah(totalAmount())}</Text>
              </View>
            </View>
            <View style={styles.cartBarRight}>
              <Text style={styles.cartBarAction}>Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.surface} />
            </View>
          </TouchableOpacity>
        </View>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerGreeting: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.surface, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.full,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },
  badgeText: { color: COLORS.surface, fontSize: 10, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: -SPACING.lg,
    gap: SPACING.sm,
    zIndex: 10,
  },
  searchBox: {
    flex: 1,
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
  scanBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  catList: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  loader: { marginTop: 60 },
  productGrid: { paddingHorizontal: SPACING.sm, paddingBottom: 100 },
  cartBarWrapper: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cartBar: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cartBarIcon: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBarText: { color: COLORS.primaryLight, fontSize: 12, fontWeight: '600' },
  cartBarTotal: { color: COLORS.surface, fontSize: 18, fontWeight: '800' },
  cartBarRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  cartBarAction: { color: COLORS.surface, fontSize: 15, fontWeight: '700' },
});
