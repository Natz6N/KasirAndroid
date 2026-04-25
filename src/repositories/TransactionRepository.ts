import { getDatabase } from '../database/db';
import type { Transaction, TransactionItem } from '../types/database';

export class TransactionRepository {
  async findById(id: number): Promise<Transaction | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  }

  async findByInvoice(invoiceNumber: string): Promise<Transaction | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE invoice_number = ?',
      [invoiceNumber]
    );
  }

  async findRecent(limit = 50): Promise<Transaction[]> {
    const db = await getDatabase();
    return db.getAllAsync<Transaction>(
      `SELECT * FROM transactions
       WHERE status = 'completed'
       ORDER BY transaction_date DESC
       LIMIT ?`,
      [limit]
    );
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const db = await getDatabase();
    return db.getAllAsync<Transaction>(
      `SELECT * FROM transactions
       WHERE status = 'completed'
         AND transaction_date >= ?
         AND transaction_date < ?
       ORDER BY transaction_date DESC`,
      [startDate, endDate]
    );
  }

  async getItems(transactionId: number): Promise<TransactionItem[]> {
    const db = await getDatabase();
    return db.getAllAsync<TransactionItem>(
      'SELECT * FROM transaction_items WHERE transaction_id = ?',
      [transactionId]
    );
  }

  async voidTransaction(id: number, reason?: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      // Verify transaction exists and is completed
      const tx = await db.getFirstAsync<{ status: string }>(
        'SELECT status FROM transactions WHERE id = ?',
        [id]
      );
      if (!tx) throw new Error('Transaksi tidak ditemukan');
      if (tx.status !== 'completed') throw new Error('Hanya transaksi selesai yang bisa di-void');

      // Get all items and reverse stock
      const items = await db.getAllAsync<{
        id: number;
        product_id: number | null;
        quantity: number;
      }>(
        'SELECT id, product_id, quantity FROM transaction_items WHERE transaction_id = ?',
        [id]
      );

      for (const item of items) {
        if (item.product_id == null) continue;

        const current = await db.getFirstAsync<{ stock: number }>(
          'SELECT stock FROM products WHERE id = ?',
          [item.product_id]
        );
        if (!current) continue;

        const stockBefore = current.stock;
        const stockAfter = stockBefore + item.quantity;

        // Restore stock
        await db.runAsync(
          "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
          [stockAfter, item.product_id]
        );

        // Insert return movement for audit trail
        await db.runAsync(
          `INSERT INTO stock_movements
           (product_id, transaction_item_id, type, quantity, stock_before, stock_after, note)
           VALUES (?,?,?,?,?,?,?)`,
          [
            item.product_id,
            item.id,
            'return',
            item.quantity,
            stockBefore,
            stockAfter,
            reason || 'Void transaksi',
          ]
        );
      }

      // Mark transaction as cancelled
      await db.runAsync(
        "UPDATE transactions SET status = 'cancelled', note = ? WHERE id = ?",
        [reason || 'Void transaksi', id]
      );
    });
  }

  /** @deprecated Use voidTransaction instead */
  async cancel(id: number): Promise<void> {
    return this.voidTransaction(id);
  }

  async getDailySummary(startDate: string, endDate: string) {
    const db = await getDatabase();
    return db.getAllAsync<{
      tanggal: string;
      jumlah_transaksi: number;
      total_penjualan: number;
      total_hpp: number;
      gross_profit: number;
      margin_persen: number;
    }>(
      `SELECT
         date(transaction_date, '+7 hours') AS tanggal,
         COUNT(*) AS jumlah_transaksi,
         SUM(total_amount) AS total_penjualan,
         SUM(total_cost) AS total_hpp,
         SUM(total_amount - total_cost) AS gross_profit,
         ROUND(
           (SUM(total_amount - total_cost) * 100.0) / NULLIF(SUM(total_amount), 0), 2
         ) AS margin_persen
       FROM transactions
       WHERE status = 'completed'
         AND transaction_date >= ?
         AND transaction_date < ?
       GROUP BY date(transaction_date, '+7 hours')
       ORDER BY tanggal DESC`,
      [startDate, endDate]
    );
  }

  async getTodaySummary() {
    const db = await getDatabase();
    // Gunakan waktu WIB (UTC+7) agar konsisten dengan transaction_date yang disimpan via getLocalISO()
    // getLocalISO() menyimpan format '2024-01-15T08:30:00+07:00', jadi range harus dalam WIB juga
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localOffset = now.getTimezoneOffset(); // menit, negatif untuk timezones ahead of UTC
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + localOffset) * 60 * 1000);

    const year = jakartaTime.getFullYear();
    const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
    const day = String(jakartaTime.getDate()).padStart(2, '0');

    const todayStart = `${year}-${month}-${day}T00:00:00+07:00`;
    const tomorrowStart = `${year}-${month}-${day}T23:59:59.999+07:00`;

    return db.getFirstAsync<{
      jumlah_transaksi: number;
      total_penjualan: number;
      total_hpp: number;
      gross_profit: number;
    }>(
      `SELECT
         COUNT(*) AS jumlah_transaksi,
         COALESCE(SUM(total_amount), 0) AS total_penjualan,
         COALESCE(SUM(total_cost), 0) AS total_hpp,
         COALESCE(SUM(total_amount - total_cost), 0) AS gross_profit
       FROM transactions
       WHERE status = 'completed'
         AND transaction_date >= ?
         AND transaction_date <= ?`,
      [todayStart, tomorrowStart]
    );
  }
}
