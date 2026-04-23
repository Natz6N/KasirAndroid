import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/** 
 * Store product images in app's private directory (not visible in gallery).
 * Images stored at: documentDirectory/product_images/
 */
const IMAGE_DIR = `${FileSystem.documentDirectory}product_images/`;

async function ensureImageDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

export async function pickProductImage(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) return null;

  const sourceUri = result.assets[0].uri;
  return saveProductImage(sourceUri);
}

export async function takeProductPhoto(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissionResult.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) return null;

  const sourceUri = result.assets[0].uri;
  return saveProductImage(sourceUri);
}

async function saveProductImage(sourceUri: string): Promise<string> {
  await ensureImageDir();
  const filename = `product_${Date.now()}.jpg`;
  const destUri = `${IMAGE_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

export async function deleteProductImage(imageUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(imageUri);
    if (info.exists) {
      await FileSystem.deleteAsync(imageUri, { idempotent: true });
    }
  } catch {
    // Ignore deletion errors
  }
}
