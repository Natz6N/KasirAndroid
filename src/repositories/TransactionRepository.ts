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

  async cancel(id: number): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const items = await db.getAllAsync<{ id: number; product_id: number | null }>(
        'SELECT id, product_id FROM transaction_items WHERE transaction_id = ?',
        [id]
      );
      for (const item of items) {
        if (item.product_id == null) continue;
        const mv = await db.getFirstAsync<{ stock_before: number }>(
          'SELECT stock_before FROM stock_movements WHERE transaction_item_id = ? ORDER BY id DESC LIMIT 1',
          [item.id]
        );
        if (mv) {
          await db.runAsync(
            "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
            [mv.stock_before, item.product_id]
          );
        }
      }
      await db.runAsync(
        "UPDATE transactions SET status = 'cancelled' WHERE id = ?",
        [id]
      );
    });
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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
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
         AND transaction_date < ?`,
      [todayStart.toISOString(), tomorrowStart.toISOString()]
    );
  }
}
