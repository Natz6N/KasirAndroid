import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface BarcodeScannerProps {
  visible: boolean;
  onScanned: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ visible, onScanned, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const cooldown = useRef(false);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  const handleBarcode = ({ data }: { data: string }) => {
    if (cooldown.current) return;
    cooldown.current = true;
    setScanned(true);
    onScanned(data);
    setTimeout(() => { cooldown.current = false; }, 2000);
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.center}>
          <ActivityIndicator color="#6366F1" />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={60} color="#D1D5DB" />
          <Text style={styles.permText}>Izin kamera diperlukan untuk scan barcode</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Izinkan Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: '#6B7280' }}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
        />
        {/* Overlay */}
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.frame} />
          <Text style={styles.hint}>Arahkan kamera ke barcode produk</Text>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanText}>Scan Lagi</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  permText: { fontSize: 15, color: '#374151', textAlign: 'center' },
  permBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permBtnText: { color: '#fff', fontWeight: '700' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  frame: {
    width: 260,
    height: 180,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#6366F1',
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rescanBtn: {
    marginTop: 16,
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  rescanText: { color: '#fff', fontWeight: '700' },
});
