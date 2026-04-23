import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { closeDatabase, resetDatabase } from '../database/db';

const DB_PATH = `${FileSystem.documentDirectory}SQLite/omah_krupuk.db`;

export class BackupService {
  async createBackup(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = `${FileSystem.documentDirectory}backup_${dateStr}.db`;
    await FileSystem.copyAsync({ from: DB_PATH, to: dest });
    return dest;
  }

  async shareBackup(): Promise<void> {
    const dest = await this.createBackup();
    await Sharing.shareAsync(dest, { mimeType: 'application/octet-stream' });
  }

  async restoreFromFile(sourceUri: string): Promise<void> {
    // Validate: check source file exists
    const info = await FileSystem.getInfoAsync(sourceUri);
    if (!info.exists) throw new Error('File backup tidak ditemukan');

    // Close current database connection
    await closeDatabase();

    // Ensure SQLite directory exists
    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    // Copy backup file over current database
    await FileSystem.copyAsync({ from: sourceUri, to: DB_PATH });

    // Also remove WAL and SHM files if they exist (clean slate)
    const walPath = `${DB_PATH}-wal`;
    const shmPath = `${DB_PATH}-shm`;
    try {
      await FileSystem.deleteAsync(walPath, { idempotent: true });
      await FileSystem.deleteAsync(shmPath, { idempotent: true });
    } catch {
      // Ignore errors — files may not exist
    }

    // Reopen database with fresh connection
    await resetDatabase();
  }

  async listBackups(): Promise<FileSystem.FileInfo[]> {
    const dir = FileSystem.documentDirectory ?? '';
    const files = await FileSystem.readDirectoryAsync(dir);
    const backupFiles = files.filter((f) => f.startsWith('backup_') && f.endsWith('.db'));
    const infos = await Promise.all(
      backupFiles.map((f) => FileSystem.getInfoAsync(`${dir}${f}`))
    );
    return infos.filter((i) => i.exists);
  }

  async deleteOldBackups(keepCount = 5): Promise<void> {
    const dir = FileSystem.documentDirectory ?? '';
    const files = await FileSystem.readDirectoryAsync(dir);
    const backups = files
      .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
      .sort()
      .reverse();
    for (const file of backups.slice(keepCount)) {
      await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true });
    }
  }
}
