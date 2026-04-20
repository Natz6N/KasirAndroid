import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const DB_PATH = `${FileSystem.documentDirectory}SQLite/omah_krupuk.db`;

export class BackupService {
  async createBackup(): Promise<string> {
    const dest = `${FileSystem.documentDirectory}backup_${Date.now()}.db`;
    await FileSystem.copyAsync({ from: DB_PATH, to: dest });
    return dest;
  }

  async shareBackup(): Promise<void> {
    const dest = await this.createBackup();
    await Sharing.shareAsync(dest, { mimeType: 'application/octet-stream' });
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
