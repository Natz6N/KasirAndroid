import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp, RouteProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { StockRepository } from '../../../repositories/StockRepository';
import { isValidBarcode } from '../../../utils/validation';
import type { Category, Product } from '../../../types/database';
import type { RootStackParamList } from '../../../types/navigation';

const productRepo = new ProductRepository();
const categoryRepo = new CategoryRepository();
const stockRepo = new StockRepository();

type RoutePropType = RouteProp<RootStackParamList, 'ProductForm'>;

export default function ProductFormScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RoutePropType>();
  const { productId } = route.params ?? {};

  const isEdit = !!productId;
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    categoryRepo.findAll().then(setCategories);
    if (productId) {
      productRepo.findById(productId).then((p) => {
        if (!p) return;
        setName(p.name);
        setSku(p.sku ?? '');
        setBarcode(p.barcode ?? '');
        setSellPrice(String(p.sell_price));
        setBuyPrice(String(p.buy_price));
        setStock(String(p.stock));
        setMinStock(String(p.min_stock));
        setUnit(p.unit);
        setCategoryId(p.category_id);
        setDescription(p.description ?? '');
      });
    }
  }, [productId]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Nama produk wajib diisi'); return; }
    const sp = parseInt(sellPrice.replace(/[^0-9]/g, ''), 10);
    const bp = parseInt(buyPrice.replace(/[^0-9]/g, ''), 10) || 0;
    if (isNaN(sp) || sp < 0) { Alert.alert('Error', 'Harga jual tidak valid'); return; }

    if (barcode && !(await checkBarcode())) return;

    setSaving(true);
    try {
      const savedId = await productRepo.upsert({
        id: productId,
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        sell_price: sp,
        buy_price: bp,
        stock: isEdit ? undefined : parseInt(stock, 10) || 0,
        min_stock: parseInt(minStock, 10) || 5,
        unit: unit.trim() || 'pcs',
        category_id: categoryId,
        description: description.trim() || null,
      });

      if (isEdit && stock !== '') {
        const newStock = parseInt(stock, 10);
        const current = await productRepo.findById(savedId);
        if (current && current.stock !== newStock) {
          await stockRepo.addManualMovement(savedId, newStock, 'Update stok oleh admin');
        }
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Gagal', e.message ?? 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const checkBarcode = async (): Promise<boolean> => {
    if (!isValidBarcode(barcode)) {
      Alert.alert('Error', 'Format barcode tidak valid');
      return false;
    }
    const exists = await productRepo.checkBarcodeExists(barcode, productId);
    if (exists) {
      Alert.alert('Error', 'Barcode sudah digunakan produk lain');
      return false;
    }
    return true;
  };

  const UNITS = ['pcs', 'kg', 'gr', 'ltr', 'bks', 'dus', 'pak'];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Field label="Nama Produk *">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama produk" />
        </Field>

        <View style={styles.row}>
          <Field label="SKU" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={sku} onChangeText={setSku} placeholder="SKU-001" />
          </Field>
          <Field label="Barcode" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={barcode} onChangeText={setBarcode} placeholder="8991234..." keyboardType="numeric" />
          </Field>
        </View>

        <View style={styles.row}>
          <Field label="Harga Jual (Rp) *" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={sellPrice} onChangeText={setSellPrice} keyboardType="numeric" placeholder="0" />
          </Field>
          <Field label="Harga Beli (Rp)" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={buyPrice} onChangeText={setBuyPrice} keyboardType="numeric" placeholder="0" />
          </Field>
        </View>

        <View style={styles.row}>
          <Field label="Stok" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" />
          </Field>
          <Field label="Min Stok" style={{ flex: 1 }}>
            <TextInput style={styles.input} value={minStock} onChangeText={setMinStock} keyboardType="numeric" placeholder="5" />
          </Field>
        </View>

        <Field label="Satuan">
          <View style={styles.unitRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitChip, unit === u && styles.unitChipActive]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Kategori">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.catChip, categoryId === null && styles.catChipActive]}
              onPress={() => setCategoryId(null)}
            >
              <Text style={[styles.catText, categoryId === null && styles.catTextActive]}>Tanpa Kategori</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.catText, categoryId === c.id && styles.catTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="Deskripsi">
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Deskripsi opsional..."
            multiline
          />
        </Field>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ gap: 4 }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#6366F1', paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  body: { padding: 16, gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E5E7EB' },
  unitChipActive: { backgroundColor: '#6366F1' },
  unitText: { fontSize: 13, color: '#374151' },
  unitTextActive: { color: '#fff', fontWeight: '600' },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E5E7EB', marginRight: 8 },
  catChipActive: { backgroundColor: '#6366F1' },
  catText: { fontSize: 13, color: '#374151' },
  catTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
