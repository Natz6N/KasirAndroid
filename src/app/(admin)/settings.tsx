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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { BackupService } from '../../services/BackupService';

const backupService = new BackupService();

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { settings, load, update } = useSettingsStore();
  const lock = useAuthStore((s) => s.lock);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [autolockMinutes, setAutolockMinutes] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name);
      setStoreAddress(settings.store_address ?? '');
      setStorePhone(settings.store_phone ?? '');
      setReceiptNote(settings.receipt_note ?? '');
      setLowStockThreshold(String(settings.low_stock_threshold));
      setAutolockMinutes(String(settings.autolock_minutes ?? 5));
    }
  }, [settings]);

  const handleSaveStore = async () => {
    setSaving(true);
    try {
      await update({
        store_name: storeName.trim(),
        store_address: storeAddress.trim() || null,
        store_phone: storePhone.trim() || null,
        receipt_note: receiptNote.trim() || null,
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
        autolock_minutes: parseInt(autolockMinutes, 10) || 5,
      });
      Alert.alert('Berhasil', 'Pengaturan disimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async () => {
    if (!/^\d{6}$/.test(newPin)) { Alert.alert('Error', 'PIN harus 6 digit angka'); return; }
    if (newPin !== confirmPin) { Alert.alert('Error', 'Konfirmasi PIN tidak cocok'); return; }

    const oldHashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, oldPin);
    if (oldHashed !== settings?.admin_pin) { Alert.alert('Error', 'PIN lama tidak sesuai'); return; }

    const newHashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPin);
    await update({ admin_pin: newHashed });
    setOldPin(''); setNewPin(''); setConfirmPin('');
    Alert.alert('Berhasil', 'PIN berhasil diubah');
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await backupService.shareBackup();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat membuat backup');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/octet-stream',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];

      if (!file.name?.endsWith('.db')) {
        Alert.alert('Error', 'File harus berformat .db');
        return;
      }

      Alert.alert(
        'Restore Database',
        'PERINGATAN: Semua data saat ini akan ditimpa dengan data dari backup. Yakin lanjutkan?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setRestoring(true);
              try {
                await backupService.restoreFromFile(file.uri);
                await load();
                Alert.alert('Berhasil', 'Database berhasil di-restore. Aplikasi akan dikunci.', [
                  { text: 'OK', onPress: () => lock() },
                ]);
              } catch (e: any) {
                Alert.alert('Gagal', e.message ?? 'Tidak dapat restore database');
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memilih file');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Store Info */}
        <Text style={styles.sectionTitle}>Informasi Toko</Text>
        <View style={styles.card}>
          <Field label="Nama Toko">
            <TextInput style={styles.input} value={storeName} onChangeText={setStoreName} placeholder="Omah Krupuk" />
          </Field>
          <Field label="Alamat">
            <TextInput style={styles.input} value={storeAddress} onChangeText={setStoreAddress} placeholder="Alamat toko" multiline />
          </Field>
          <Field label="Nomor Telepon">
            <TextInput style={styles.input} value={storePhone} onChangeText={setStorePhone} placeholder="0812..." keyboardType="phone-pad" />
          </Field>
          <Field label="Catatan Struk">
            <TextInput style={styles.input} value={receiptNote} onChangeText={setReceiptNote} placeholder="Terima kasih..." />
          </Field>
          <Field label="Batas Stok Rendah">
            <TextInput style={styles.input} value={lowStockThreshold} onChangeText={setLowStockThreshold} keyboardType="numeric" placeholder="5" />
          </Field>
          <Field label="Auto-lock (menit)">
            <TextInput style={styles.input} value={autolockMinutes} onChangeText={setAutolockMinutes} keyboardType="numeric" placeholder="5" />
          </Field>
          <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={handleSaveStore} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Simpan</Text>}
          </TouchableOpacity>
        </View>

        {/* Change PIN */}
        <Text style={styles.sectionTitle}>Ubah PIN</Text>
        <View style={styles.card}>
          <Field label="PIN Lama">
            <TextInput style={styles.input} value={oldPin} onChangeText={setOldPin} secureTextEntry keyboardType="numeric" maxLength={6} placeholder="••••••" />
          </Field>
          <Field label="PIN Baru">
            <TextInput style={styles.input} value={newPin} onChangeText={setNewPin} secureTextEntry keyboardType="numeric" maxLength={6} placeholder="••••••" />
          </Field>
          <Field label="Konfirmasi PIN Baru">
            <TextInput style={styles.input} value={confirmPin} onChangeText={setConfirmPin} secureTextEntry keyboardType="numeric" maxLength={6} placeholder="••••••" />
          </Field>
          <TouchableOpacity style={styles.btn} onPress={handleChangePin}>
            <Text style={styles.btnText}>Ubah PIN</Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Restore */}
        <Text style={styles.sectionTitle}>Backup & Restore</Text>
        <View style={styles.card}>
          <Text style={styles.backupNote}>
            Backup akan membuat salinan database. Restore akan menimpa semua data saat ini.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#10B981' }, backingUp && { opacity: 0.6 }]}
            onPress={handleBackup}
            disabled={backingUp}
          >
            {backingUp ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Backup Sekarang</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#F59E0B', marginTop: 8 }, restoring && { opacity: 0.6 }]}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Restore dari File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4, marginBottom: 12 }}>
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
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  btn: {
    backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backupNote: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
});
