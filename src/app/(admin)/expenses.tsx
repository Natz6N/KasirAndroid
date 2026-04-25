import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpenseRepository } from '../../repositories/ExpenseRepository';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatDisplayDate } from '../../utils/dateHelper';
import EmptyState from '../../components/EmptyState';
import NumberPad from '../../components/NumberPad';
import type { Expense, ExpenseCategory } from '../../types/database';

const expenseRepo = new ExpenseRepository();

const CATEGORIES: { key: ExpenseCategory; label: string; icon: string; color: string }[] = [
  { key: 'listrik', label: 'Listrik', icon: 'flash-outline', color: '#F59E0B' },
  { key: 'sewa', label: 'Sewa', icon: 'home-outline', color: '#8B5CF6' },
  { key: 'gaji', label: 'Gaji', icon: 'people-outline', color: '#3B82F6' },
  { key: 'restock', label: 'Restock', icon: 'cube-outline', color: '#10B981' },
  { key: 'transport', label: 'Transport', icon: 'car-outline', color: '#EC4899' },
  { key: 'lain', label: 'Lainnya', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalToday, setTotalToday] = useState(0);

  // Add expense modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('lain');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, todayTotal] = await Promise.all([
        expenseRepo.findAll(),
        expenseRepo.getTodayTotal(),
      ]);
      setExpenses(data);
      setTotalToday(todayTotal);
    } catch {
      setError('Gagal memuat data pengeluaran');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    const amount = parseInt(amountInput, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Masukkan jumlah yang valid');
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      await expenseRepo.create(today, selectedCategory, amount, noteInput.trim() || null);
      setModalVisible(false);
      setAmountInput('');
      setNoteInput('');
      setSelectedCategory('lain');
      await load();
    } catch (e: any) {
      Alert.alert('Gagal', e.message ?? 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Hapus Pengeluaran',
      `Hapus pengeluaran ${formatRupiah(expense.amount)}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseRepo.delete(expense.id);
              await load();
            } catch {
              Alert.alert('Gagal', 'Tidak dapat menghapus pengeluaran');
            }
          },
        },
      ]
    );
  };

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengeluaran</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.sumLabel}>Hari Ini</Text>
          <Text style={[styles.sumValue, { color: '#EF4444' }]}>{formatRupiah(totalToday)}</Text>
        </View>
        <View style={[styles.sumCard, { borderLeftColor: '#6366F1' }]}>
          <Text style={styles.sumLabel}>Total Ditampilkan</Text>
          <Text style={[styles.sumValue, { color: '#6366F1' }]}>{formatRupiah(totalAll)}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
      ) : error ? (
        <EmptyState type="error" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Belum ada pengeluaran"
              message="Catat pengeluaran harian Anda"
            />
          }
          renderItem={({ item: e }) => {
            const cat = CATEGORY_MAP[e.category] ?? CATEGORY_MAP.lain;
            return (
              <TouchableOpacity
                style={styles.expenseCard}
                onLongPress={() => handleDelete(e)}
                activeOpacity={0.7}
              >
                <View style={[styles.expenseIcon, { backgroundColor: `${cat.color}15` }]}>
                  <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <View style={styles.expenseBody}>
                  <Text style={styles.expenseCat}>{cat.label}</Text>
                  {e.note ? <Text style={styles.expenseNote} numberOfLines={1}>{e.note}</Text> : null}
                  <Text style={styles.expenseDate}>{formatDisplayDate(e.date)}</Text>
                </View>
                <Text style={styles.expenseAmount}>-{formatRupiah(e.amount)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheet}
          >
            <View style={styles.dragHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Catat Pengeluaran</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Category picker */}
            <Text style={styles.fieldLabel}>Kategori</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.catChip,
                    selectedCategory === c.key && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                  onPress={() => setSelectedCategory(c.key)}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={16}
                    color={selectedCategory === c.key ? '#fff' : c.color}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      selectedCategory === c.key && { color: '#fff' },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <View style={styles.amountBox}>
              <Text style={styles.amountCaption}>Jumlah</Text>
              <Text style={styles.amountText}>
                {amountInput ? formatRupiah(parseInt(amountInput, 10) || 0) : 'Rp 0'}
              </Text>
            </View>

            {/* Note */}
            <TextInput
              style={styles.noteInput}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Catatan (opsional)"
              placeholderTextColor="#9CA3AF"
            />

            <NumberPad value={amountInput} onChange={setAmountInput} />

            <TouchableOpacity
              style={[styles.saveBtn, (!amountInput || saving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!amountInput || saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, paddingTop: 12, paddingBottom: 4 },
  sumCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    borderLeftWidth: 4,
  },
  sumLabel: { fontSize: 11, color: '#6B7280' },
  sumValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  list: { paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 100 },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    gap: 12,
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseBody: { flex: 1 },
  expenseCat: { fontSize: 14, fontWeight: '700', color: '#111827' },
  expenseNote: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  expenseDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
  },
  dragHandle: {
    width: 48, height: 5, backgroundColor: '#D1D5DB',
    borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sheetClose: { backgroundColor: '#F3F4F6', borderRadius: 20, padding: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  amountBox: {
    paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  amountCaption: { fontSize: 12, color: '#9CA3AF' },
  amountText: { fontSize: 28, fontWeight: '700', color: '#6366F1', marginTop: 4 },
  noteInput: {
    marginHorizontal: 20, marginTop: 8, marginBottom: 4,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  saveBtn: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#A5B4FC' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});