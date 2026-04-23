import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryRepository } from '../../repositories/CategoryRepository';
import { useCategories } from '../../hooks/useCategories';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { COLORS, RADIUS, SPACING } from '../../theme/colors';
import type { Category } from '../../types/database';

const categoryRepo = new CategoryRepository();

const PRESET_COLORS = [
  '#6366F1', // primary
  '#EC4899', // pink
  '#F59E0B', // warning/amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#EF4444', // danger/red
  '#8B5CF6', // violet
  '#14B8A6', // teal
];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const { data: categories, isLoading, error } = useCategories();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const saveMutation = useMutation({
    mutationFn: (data: { id?: number, name: string, color_hex: string }) => 
      categoryRepo.upsert({ id: data.id, name: data.name, color_hex: data.color_hex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setModalVisible(false);
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Gagal menyimpan kategori')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryRepo.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Gagal menghapus kategori')
  });

  const openModal = (cat?: Category) => {
    setEditing(cat ?? null);
    setName(cat?.name ?? '');
    setColor(cat?.color_hex ?? PRESET_COLORS[0]);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', 'Nama kategori wajib diisi'); return; }
    saveMutation.mutate({ id: editing?.id, name: name.trim(), color_hex: color });
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Hapus Kategori', `Yakin ingin menghapus "${cat.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(cat.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kategori Produk</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.headerBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={26} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
      ) : error ? (
        <Text style={styles.empty}>Gagal memuat kategori</Text>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Belum ada kategori</Text>}
          renderItem={({ item: cat }) => (
            <View style={styles.catRow}>
              <View style={[styles.colorDot, { backgroundColor: cat.color_hex }]} />
              <Text style={styles.catName}>{cat.name}</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openModal(cat)} hitSlop={12} style={styles.actionBtn}>
                  <Ionicons name="create" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(cat)} hitSlop={12} style={[styles.actionBtn, {backgroundColor: '#FEE2E2'}]}>
                  <Ionicons name="trash" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Kategori</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Minuman Dingin"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Warna Label</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorSwatch, 
                      { backgroundColor: c }, 
                      color === c && styles.colorSwatchActive,
                      color === c && { borderColor: c } // Border color matches inner color for pop effect
                    ]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  >
                    {color === c && <View style={styles.colorSwatchInner} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={saveMutation.isPending}
                activeOpacity={0.8}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color={COLORS.surface} size="small" />
                ) : (
                  <Text style={styles.saveText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl,
    elevation: 4, shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerBtn: { padding: SPACING.sm },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.surface },
  list: { padding: SPACING.lg, paddingTop: SPACING.xl },
  loader: { marginTop: 40 },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, 
    elevation: 2, shadowColor: COLORS.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  colorDot: { width: 14, height: 14, borderRadius: RADIUS.full },
  catName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 15, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: {
    backgroundColor: COLORS.primaryLight + '40', // slightly transparent
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { 
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, 
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, gap: SPACING.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  inputGroup: { gap: SPACING.xs },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, fontSize: 15, color: COLORS.text,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.xs },
  colorSwatch: { 
    width: 36, height: 36, borderRadius: RADIUS.full, 
    justifyContent: 'center', alignItems: 'center'
  },
  colorSwatchActive: { borderWidth: 2, transform: [{scale: 1.1}] },
  colorSwatchInner: { width: 14, height: 14, borderRadius: RADIUS.full, backgroundColor: COLORS.surface },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: { 
    flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center' 
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', elevation: 2 },
  saveBtnDisabled: { backgroundColor: COLORS.primaryLight, elevation: 0 },
  saveText: { color: COLORS.surface, fontWeight: '800', fontSize: 15 },
});
