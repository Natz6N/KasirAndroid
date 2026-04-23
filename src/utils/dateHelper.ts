import type { SQLiteDatabase } from 'expo-sqlite';

export function getLocalISO(): string {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
    .replace(' ', 'T') + '+07:00';
}

export async function generateInvoiceNumber(db: SQLiteDatabase): Promise<string> {
  const dateStr = new Date()
    .toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .split('/')
    .reverse()
    .join('');
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) + 1 AS count FROM transactions
     WHERE invoice_number LIKE ?`,
    [`INV/${dateStr}/%`]
  );
  const seq = String(result?.count ?? 1).padStart(4, '0');
  return `INV/${dateStr}/${seq}`;
}

export function toStartOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().replace('Z', '+07:00');
}

export function toEndOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().replace('Z', '+07:00');
}

export function formatDisplayDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDisplayDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMonthRange(offset = 0): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
