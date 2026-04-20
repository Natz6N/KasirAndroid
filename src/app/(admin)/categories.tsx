import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryRepository } from '../../repositories/CategoryRepository';
import type { Category } from '../../types/database';

const categoryRepo = new CategoryRepository();

const COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6'];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const load = useCallback(async () => {
    setCategories(await categoryRepo.findAll());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = (cat?: Category) => {
    setEditing(cat ?? null);
    setName(cat?.name ?? '');
    setColor(cat?.color_hex ?? COLORS[0]);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Nama kategori wajib diisi'); return; }
    await categoryRepo.upsert({ id: editing?.id, name: name.trim(), color_hex: color });
    setModalVisible(false);
    load();
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Hapus Kategori', `Hapus "${cat.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => { await categoryRepo.softDelete(cat.id); load(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kategori</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada kategori</Text>}
        renderItem={({ item: cat }) => (
          <View style={styles.catRow}>
            <View style={[styles.colorDot, { backgroundColor: cat.color_hex }]} />
            <Text style={styles.catName}>{cat.name}</Text>
            <TouchableOpacity onPress={() => openModal(cat)}>
              <Ionicons name="create-outline" size={20} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(cat)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nama kategori"
              autoFocus
            />
            <Text style={styles.colorLabel}>Warna</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  list: { padding: 12 },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1,
  },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  catName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  colorLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive: { borderWidth: 3, borderColor: '#111827' },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
