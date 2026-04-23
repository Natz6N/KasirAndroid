import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { StockRepository } from '../../../repositories/StockRepository';
import { isValidBarcode } from '../../../utils/validation';
import { useCategories } from '../../../hooks/useCategories';
import type { RootStackParamList } from '../../../types/navigation';
import { COLORS, RADIUS, SPACING } from '../../../theme/colors';
import { pickProductImage, takeProductPhoto, deleteProductImage } from '../../../services/ImageService';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';

const productRepo = new ProductRepository();
const stockRepo = new StockRepository();

const productSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(200, 'Maksimal 200 karakter'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  sell_price: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
  buy_price: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
  stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
  min_stock: z.coerce.number().int().min(0, 'Minimal stok tidak boleh negatif'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  category_id: z.number().nullable(),
  description: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const UNITS = ['pcs', 'kg', 'gr', 'ltr', 'bks', 'dus', 'pak'];

export default function ProductFormScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductForm'>>();
  const queryClient = useQueryClient();
  const { productId } = route.params ?? {};
  const isEdit = !!productId;

  const { data: categories = [] } = useCategories();
  const [saving, setSaving] = useState(false);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      sell_price: 0,
      buy_price: 0,
      stock: 0,
      min_stock: 5,
      unit: 'pcs',
      category_id: null,
      description: '',
    },
  });

  useEffect(() => {
    if (productId) {
      productRepo.findById(productId).then((p) => {
        if (!p) return;
        setValue('name', p.name);
        setValue('sku', p.sku ?? '');
        setValue('barcode', p.barcode ?? '');
        setValue('sell_price', p.sell_price);
        setValue('buy_price', p.buy_price);
        setValue('stock', p.stock);
        setValue('min_stock', p.min_stock);
        setValue('unit', p.unit);
        setValue('category_id', p.category_id);
        setValue('description', p.description ?? '');
        setInitialStock(p.stock);
        if (p.image_uri) {
          setImageUri(p.image_uri);
          setOriginalImageUri(p.image_uri);
        }
      });
    }
  }, [productId, setValue]);

  const handlePickImage = () => {
    Alert.alert('Pilih Sumber', 'Ambil gambar produk dari:', [
      {
        text: 'Kamera',
        onPress: async () => {
          const uri = await takeProductPhoto();
          if (uri) setImageUri(uri);
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          const uri = await pickProductImage();
          if (uri) setImageUri(uri);
        },
      },
      ...(imageUri ? [{
        text: 'Hapus Gambar',
        style: 'destructive' as const,
        onPress: () => setImageUri(null),
      }] : []),
      { text: 'Batal', style: 'cancel' as const },
    ]);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (data.barcode) {
      if (!isValidBarcode(data.barcode)) {
        Alert.alert('Error', 'Format barcode tidak valid');
        return;
      }
      const exists = await productRepo.checkBarcodeExists(data.barcode, productId);
      if (exists) {
        Alert.alert('Error', 'Barcode sudah digunakan produk lain');
        return;
      }
    }

    setSaving(true);
    try {
      const savedId = await productRepo.upsert({
        id: productId,
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        barcode: data.barcode?.trim() || null,
        sell_price: data.sell_price,
        buy_price: data.buy_price,
        stock: isEdit ? undefined : data.stock,
        min_stock: data.min_stock,
        unit: data.unit.trim() || 'pcs',
        category_id: data.category_id,
        description: data.description?.trim() || null,
        image_uri: imageUri,
      });

      if (isEdit && data.stock !== initialStock) {
        await stockRepo.addManualMovement(savedId, data.stock, 'Update stok oleh admin');
      }

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['products'] });

      Alert.alert('Sukses', 'Produk berhasil disimpan', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Gagal', e.message ?? 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 80 }]}>
        {/* Product Image */}
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.imagePlaceholderText}>Tambah Foto</Text>
            </View>
          )}
          <View style={styles.imageEditBadge}>
            <Ionicons name="create-outline" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        <Field label="Nama Produk *" error={errors.name?.message}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Nama produk" />
            )}
          />
        </Field>

        <View style={styles.row}>
          <Field label="SKU" error={errors.sku?.message} style={{ flex: 1 }}>
            <Controller
              control={control}
              name="sku"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="SKU-001" />
              )}
            />
          </Field>
          <Field label="Barcode" error={errors.barcode?.message} style={{ flex: 1 }}>
            <Controller
              control={control}
              name="barcode"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="899123..." keyboardType="numeric" />
              )}
            />
          </Field>
        </View>

        <View style={styles.row}>
          <Field label="Harga Jual (Rp) *" error={errors.sell_price?.message} style={{ flex: 1 }}>
            <Controller
              control={control}
              name="sell_price"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} value={String(value || '')} onChangeText={onChange} keyboardType="numeric" placeholder="0" />
              )}
            />
          </Field>
          <Field label="Harga Beli (Rp)" error={errors.buy_price?.message} style={{ flex: 1 }}>
            <Controller
              control={control}
              name="buy_price"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} value={String(value || '')} onChangeText={onChange} keyboardType="numeric" placeholder="0" />
              )}
            />
          </Field>
        </View>

        <View style={styles.row}>
          <Field label="Stok" error={errors.stock?.message} style={{ flex: 1 }}>
            <Controller
              control={control}
              name="stock"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} value={String(value || '')} onChangeText={onChange} keyboardType="numeric" placeholder="0" />
              )}
            />
          </Field>
          <Field label="Min Stok" error={errors.min_stock?.message} style={{ flex: 1 }}>
            <Controller
              control={control}
              name="min_stock"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} value={String(value || '')} onChangeText={onChange} keyboardType="numeric" placeholder="5" />
              )}
            />
          </Field>
        </View>

        <Field label="Satuan" error={errors.unit?.message}>
          <Controller
            control={control}
            name="unit"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipRow}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.chip, value === u && styles.chipActive]}
                    onPress={() => onChange(u)}
                  >
                    <Text style={[styles.chipText, value === u && styles.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </Field>

        <Field label="Kategori" error={errors.category_id?.message}>
          <Controller
            control={control}
            name="category_id"
            render={({ field: { onChange, value } }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                <TouchableOpacity
                  style={[styles.chip, value === null && styles.chipActive]}
                  onPress={() => onChange(null)}
                >
                  <Text style={[styles.chipText, value === null && styles.chipTextActive]}>Tanpa Kategori</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, value === c.id && styles.chipActive]}
                    onPress={() => onChange(c.id)}
                  >
                    <Text style={[styles.chipText, value === c.id && styles.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          />
        </Field>

        <Field label="Deskripsi" error={errors.description?.message}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={value}
                onChangeText={onChange}
                placeholder="Tambahkan catatan (opsional)"
                multiline
              />
            )}
          />
        </Field>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Simpan Perubahan' : 'Simpan Produk Baru'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, error, children, style }: { label: string; error?: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ gap: SPACING.xs }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl,
    elevation: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.surface },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  body: { padding: SPACING.lg, gap: SPACING.lg },
  row: { flexDirection: 'row', gap: SPACING.md },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontSize: 15, color: COLORS.text,
  },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: -2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.surface, fontWeight: '700' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.lg, backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12,
  },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.lg,
    alignItems: 'center', elevation: 2,
  },
  saveBtnDisabled: { backgroundColor: COLORS.primaryLight, elevation: 0 },
  saveBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: '800' },
  imagePicker: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    elevation: 2,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});
