import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { isValidBarcode } from '../../../utils/validation';
import { useCategories } from '../../../hooks/useCategories';
import type { RootStackParamList } from '../../../types/navigation';
import { COLORS, RADIUS, SPACING } from '../../../theme/colors';
import { pickProductImage, takeProductPhoto } from '../../../services/ImageService';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';

const productRepo = new ProductRepository();
const stockRepo = new StockRepository();
const categoryRepo = new CategoryRepository();

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

// Satuan bawaan
const DEFAULT_UNITS = ['pcs', 'kg', 'gr', 'ltr', 'bks', 'dus', 'pak'];

// Warna preset untuk kategori baru
const PRESET_COLORS = [
  '#6366F1', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6',
];

export default function ProductFormScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductForm'>>();
  const queryClient = useQueryClient();
  const { productId } = route.params ?? {};
  const isEdit = !!productId;

  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const [saving, setSaving] = useState(false);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // ── State untuk satuan custom ──────────────────────────────────────────────
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');

  // ── State untuk kategori custom (tambah cepat) ─────────────────────────────
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [savingCategory, setSavingCategory] = useState(false);

  const allUnits = [...DEFAULT_UNITS, ...customUnits];

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
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

  const currentUnit = watch('unit');

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
        if (p.image_uri) setImageUri(p.image_uri);

        // Jika unit produk tidak ada di default, tambahkan ke custom
        if (p.unit && !DEFAULT_UNITS.includes(p.unit)) {
          setCustomUnits((prev) => prev.includes(p.unit) ? prev : [...prev, p.unit]);
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

  // ── Handler tambah satuan custom ──────────────────────────────────────────
  const handleAddUnit = () => {
    const trimmed = newUnitInput.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Error', 'Nama satuan tidak boleh kosong');
      return;
    }
    if (allUnits.includes(trimmed)) {
      Alert.alert('Info', `Satuan "${trimmed}" sudah ada`);
      setNewUnitInput('');
      setShowAddUnit(false);
      return;
    }
    setCustomUnits((prev) => [...prev, trimmed]);
    setValue('unit', trimmed);
    setNewUnitInput('');
    setShowAddUnit(false);
  };

  const handleRemoveCustomUnit = (unit: string) => {
    setCustomUnits((prev) => prev.filter((u) => u !== unit));
    // Jika unit yang dihapus sedang dipilih, reset ke 'pcs'
    if (currentUnit === unit) setValue('unit', 'pcs');
  };

  // ── Handler tambah kategori baru (quick-add) ──────────────────────────────
  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Nama kategori tidak boleh kosong');
      return;
    }
    setSavingCategory(true);
    try {
      const newId = await categoryRepo.upsert({
        name: trimmed,
        color_hex: newCategoryColor,
      });
      await refetchCategories();
      setValue('category_id', newId);
      setNewCategoryName('');
      setNewCategoryColor(PRESET_COLORS[0]);
      setShowAddCategory(false);
    } catch (e: any) {
      Alert.alert('Gagal', e.message ?? 'Gagal membuat kategori');
    } finally {
      setSavingCategory(false);
    }
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

      queryClient.invalidateQueries({ queryKey: ['products'] });

      Alert.alert('Sukses', 'Produk berhasil disimpan', [
        { text: 'OK', onPress: () => navigation.goBack() },
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

        {/* ── Satuan dengan Custom Input ──────────────────────────────────── */}
        <Field label="Satuan" error={errors.unit?.message}>
          <Controller
            control={control}
            name="unit"
            render={({ field: { onChange, value } }) => (
              <View style={{ gap: SPACING.sm }}>
                <View style={styles.chipRow}>
                  {allUnits.map((u) => (
                    <View key={u} style={styles.chipWrapper}>
                      <TouchableOpacity
                        style={[styles.chip, value === u && styles.chipActive]}
                        onPress={() => onChange(u)}
                      >
                        <Text style={[styles.chipText, value === u && styles.chipTextActive]}>{u}</Text>
                      </TouchableOpacity>
                      {/* Tombol hapus untuk satuan custom */}
                      {customUnits.includes(u) && (
                        <TouchableOpacity
                          style={styles.removeChipBtn}
                          onPress={() => handleRemoveCustomUnit(u)}
                          hitSlop={4}
                        >
                          <Ionicons name="close-circle" size={14} color={COLORS.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* Tombol tambah satuan custom */}
                  <TouchableOpacity
                    style={styles.addChipBtn}
                    onPress={() => setShowAddUnit(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={styles.addChipText}>Custom</Text>
                  </TouchableOpacity>
                </View>

                {/* Input tambah satuan inline */}
                {showAddUnit && (
                  <View style={styles.inlineInputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, height: 40, paddingVertical: 8 }]}
                      value={newUnitInput}
                      onChangeText={setNewUnitInput}
                      placeholder="Contoh: botol, lembar, rim..."
                      autoFocus
                      onSubmitEditing={handleAddUnit}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={styles.inlineConfirmBtn} onPress={handleAddUnit}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.inlineCancelBtn}
                      onPress={() => { setShowAddUnit(false); setNewUnitInput(''); }}
                    >
                      <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        </Field>

        {/* ── Kategori dengan Quick-Add ────────────────────────────────────── */}
        <Field label="Kategori" error={errors.category_id?.message}>
          <Controller
            control={control}
            name="category_id"
            render={({ field: { onChange, value } }) => (
              <View style={{ gap: SPACING.sm }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: SPACING.sm, paddingVertical: 2 }}
                >
                  <TouchableOpacity
                    style={[styles.chip, value === null && styles.chipActive]}
                    onPress={() => onChange(null)}
                  >
                    <Text style={[styles.chipText, value === null && styles.chipTextActive]}>Tanpa Kategori</Text>
                  </TouchableOpacity>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.chip,
                        value === c.id && styles.chipActive,
                        value === c.id && { backgroundColor: c.color_hex, borderColor: c.color_hex },
                      ]}
                      onPress={() => onChange(c.id)}
                    >
                      <View style={[styles.catDot, { backgroundColor: value === c.id ? '#fff' : c.color_hex }]} />
                      <Text style={[styles.chipText, value === c.id && styles.chipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {/* Tombol tambah kategori baru */}
                  <TouchableOpacity
                    style={styles.addChipBtn}
                    onPress={() => setShowAddCategory(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={styles.addChipText}>Baru</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
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

      {/* Floating Save Button */}
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

      {/* ── Modal Tambah Kategori Baru ──────────────────────────────────────── */}
      <Modal visible={showAddCategory} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
            <Text style={styles.modalTitle}>Tambah Kategori Baru</Text>
            <Text style={styles.modalSubtitle}>
              Kategori baru akan langsung dipilih untuk produk ini
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Nama Kategori *</Text>
              <TextInput
                style={styles.input}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Contoh: Minuman, Makanan Ringan..."
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Warna Label</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      newCategoryColor === c && styles.colorSwatchActive,
                    ]}
                    onPress={() => setNewCategoryColor(c)}
                    activeOpacity={0.8}
                  >
                    {newCategoryColor === c && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {/* Preview */}
              <View style={[styles.categoryPreview, { backgroundColor: newCategoryColor + '20', borderColor: newCategoryColor }]}>
                <View style={[styles.catDot, { backgroundColor: newCategoryColor, width: 10, height: 10 }]} />
                <Text style={[styles.categoryPreviewText, { color: newCategoryColor }]}>
                  {newCategoryName || 'Nama Kategori'}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddCategory(false); setNewCategoryName(''); setNewCategoryColor(PRESET_COLORS[0]); }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, savingCategory && styles.confirmBtnDisabled]}
                onPress={handleAddCategory}
                disabled={savingCategory}
                activeOpacity={0.8}
              >
                {savingCategory ? (
                  <ActivityIndicator color={COLORS.surface} size="small" />
                ) : (
                  <Text style={styles.confirmText}>Simpan & Pilih</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // ── Chip styles ────────────────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chipWrapper: { position: 'relative' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.surface, fontWeight: '700' },
  removeChipBtn: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
  },
  addChipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
  },
  addChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  // ── Inline input row (untuk tambah satuan) ─────────────────────────────────
  inlineInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  inlineConfirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  inlineCancelBtn: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },

  // ── Category dot ──────────────────────────────────────────────────────────
  catDot: { width: 8, height: 8, borderRadius: 4 },

  // ── Footer ─────────────────────────────────────────────────────────────────
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

  // ── Image ──────────────────────────────────────────────────────────────────
  imagePicker: {
    alignSelf: 'center', width: 140, height: 140, borderRadius: RADIUS.xl,
    overflow: 'hidden', backgroundColor: COLORS.surface,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', elevation: 2,
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.xs },
  imagePlaceholderText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  imageEditBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center', elevation: 4,
  },

  // ── Modal Tambah Kategori ──────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, gap: SPACING.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: -SPACING.md },
  inputGroup: { gap: SPACING.sm },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  colorSwatch: {
    width: 38, height: 38, borderRadius: RADIUS.full,
    justifyContent: 'center', alignItems: 'center',
  },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.1 }] },
  categoryPreview: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1, alignSelf: 'flex-start', marginTop: SPACING.sm,
  },
  categoryPreviewText: { fontSize: 14, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', elevation: 2 },
  confirmBtnDisabled: { backgroundColor: COLORS.primaryLight, elevation: 0 },
  confirmText: { color: COLORS.surface, fontWeight: '800', fontSize: 15 },
});
