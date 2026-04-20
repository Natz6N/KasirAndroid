import { getDatabase } from '../database/db';
import type { DailySalesRow, TopProductRow } from '../types/database';

export class ReportService {
  async getDailySales(startDate: string, endDate: string): Promise<DailySalesRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<DailySalesRow>(
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

  async getProfitByTransaction(startDate: string, endDate: string) {
    const db = await getDatabase();
    return db.getAllAsync<{
      invoice_number: string;
      transaction_date: string;
      cashier_name: string;
      total_amount: number;
      total_cost: number;
      profit: number;
      margin: number;
      payment_method: string;
    }>(
      `SELECT
         t.invoice_number,
         t.transaction_date,
         t.cashier_name,
         t.total_amount,
         t.total_cost,
         (t.total_amount - t.total_cost) AS profit,
         ROUND((t.total_amount - t.total_cost) * 100.0 / NULLIF(t.total_amount, 0), 2) AS margin,
         t.payment_method
       FROM transactions t
       WHERE t.status = 'completed'
         AND t.transaction_date >= ?
         AND t.transaction_date < ?
       ORDER BY t.transaction_date DESC`,
      [startDate, endDate]
    );
  }

  async getTopProducts(startDate: string, limit = 10): Promise<TopProductRow[]> {
    const db = await getDatabase();
    return db.getAllAsync<TopProductRow>(
      `SELECT
         ti.product_id,
         ti.product_name,
         SUM(ti.quantity) AS total_terjual,
         SUM(ti.subtotal) AS total_revenue,
         SUM(ti.quantity * ti.unit_cost) AS total_hpp,
         SUM(ti.subtotal - (ti.quantity * ti.unit_cost)) AS total_profit
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.status = 'completed'
         AND t.transaction_date >= ?
       GROUP BY ti.product_id, ti.product_name
       ORDER BY total_terjual DESC
       LIMIT ?`,
      [startDate, limit]
    );
  }

  async getUnsellingProducts() {
    const db = await getDatabase();
    return db.getAllAsync<{
      id: number;
      name: string;
      barcode: string | null;
      sku: string | null;
      stock: number;
      sell_price: number;
      buy_price: number;
      created_at: string;
      category_name: string | null;
    }>(
      `SELECT
         p.id, p.name, p.barcode, p.sku,
         p.stock, p.sell_price, p.buy_price,
         p.created_at,
         c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1
         AND p.id NOT IN (
           SELECT DISTINCT ti.product_id
           FROM transaction_items ti
           JOIN transactions t ON t.id = ti.transaction_id
           WHERE t.status = 'completed'
             AND t.transaction_date >= datetime('now', '-30 days', '+7 hours')
             AND ti.product_id IS NOT NULL
         )
       ORDER BY p.stock DESC`
    );
  }

  async getPaymentMethodSummary(startDate: string, endDate: string) {
    const db = await getDatabase();
    return db.getAllAsync<{
      payment_method: string;
      jumlah: number;
      total: number;
    }>(
      `SELECT payment_method, COUNT(*) AS jumlah, SUM(total_amount) AS total
       FROM transactions
       WHERE status = 'completed'
         AND transaction_date >= ?
         AND transaction_date < ?
       GROUP BY payment_method
       ORDER BY total DESC`,
      [startDate, endDate]
    );
  }

  async getProfitByCategory(startDate: string, endDate: string) {
    const db = await getDatabase();
    return db.getAllAsync<{
      kategori: string;
      total_terjual: number;
      revenue: number;
      hpp: number;
      profit: number;
    }>(
      `SELECT
         COALESCE(c.name, 'Tanpa Kategori') AS kategori,
         SUM(ti.quantity) AS total_terjual,
         SUM(ti.subtotal) AS revenue,
         SUM(ti.quantity * ti.unit_cost) AS hpp,
         SUM(ti.subtotal - ti.quantity * ti.unit_cost) AS profit
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN products p ON p.id = ti.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE t.status = 'completed'
         AND t.transaction_date >= ?
         AND t.transaction_date < ?
       GROUP BY c.id, c.name
       ORDER BY profit DESC`,
      [startDate, endDate]
    );
  }
}
