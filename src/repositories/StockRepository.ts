import { getDatabase } from '../database/db';
import type { StockMovement, StockMovementType } from '../types/database';

export class StockRepository {
  async getMovementsByProduct(productId: number, limit = 50): Promise<StockMovement[]> {
    const db = await getDatabase();
    return db.getAllAsync<StockMovement>(
      `SELECT sm.*, t.invoice_number
       FROM stock_movements sm
       LEFT JOIN transaction_items ti ON ti.id = sm.transaction_item_id
       LEFT JOIN transactions t ON t.id = ti.transaction_id
       WHERE sm.product_id = ?
       ORDER BY sm.created_at DESC
       LIMIT ?`,
      [productId, limit]
    );
  }

  async addStock(productId: number, qty: number, note: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const current = await db.getFirstAsync<{ stock: number }>(
        'SELECT stock FROM products WHERE id = ?',
        [productId]
      );
      if (!current) throw new Error('Produk tidak ditemukan');

      const stockBefore = current.stock;
      const stockAfter = stockBefore + qty;

      await db.runAsync(
        "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        [stockAfter, productId]
      );

      await db.runAsync(
        `INSERT INTO stock_movements
         (product_id, type, quantity, stock_before, stock_after, note)
         VALUES (?,?,?,?,?,?)`,
        [productId, 'in', qty, stockBefore, stockAfter, note]
      );
    });
  }

  async removeStock(productId: number, qty: number, note: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const current = await db.getFirstAsync<{ stock: number }>(
        'SELECT stock FROM products WHERE id = ?',
        [productId]
      );
      if (!current) throw new Error('Produk tidak ditemukan');
      if (current.stock < qty) throw new Error('Stok tidak mencukupi');

      const stockBefore = current.stock;
      const stockAfter = stockBefore - qty;

      await db.runAsync(
        "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        [stockAfter, productId]
      );

      await db.runAsync(
        `INSERT INTO stock_movements
         (product_id, type, quantity, stock_before, stock_after, note)
         VALUES (?,?,?,?,?,?)`,
        [productId, 'out', qty, stockBefore, stockAfter, note || 'Stok keluar manual']
      );
    });
  }

  async adjustStock(productId: number, actualStock: number, note: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const current = await db.getFirstAsync<{ stock: number }>(
        'SELECT stock FROM products WHERE id = ?',
        [productId]
      );
      if (!current) throw new Error('Produk tidak ditemukan');

      const stockBefore = current.stock;
      const diff = Math.abs(actualStock - stockBefore);
      if (diff === 0) return; // no change

      const type: StockMovementType = 'adjustment';

      await db.runAsync(
        "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        [actualStock, productId]
      );

      await db.runAsync(
        `INSERT INTO stock_movements
         (product_id, type, quantity, stock_before, stock_after, note)
         VALUES (?,?,?,?,?,?)`,
        [productId, type, diff, stockBefore, actualStock, note || 'Penyesuaian stok (opname)']
      );
    });
  }

  /** @deprecated Use addStock instead */
  async addManualMovement(
    productId: number,
    newStock: number,
    note: string
  ): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const current = await db.getFirstAsync<{ stock: number }>(
        'SELECT stock FROM products WHERE id = ?',
        [productId]
      );
      if (!current) throw new Error('Produk tidak ditemukan');

      const stockBefore = current.stock;
      const diff = Math.abs(newStock - stockBefore);
      const type: StockMovementType = newStock > stockBefore ? 'in' : 'adjustment';

      await db.runAsync(
        "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        [newStock, productId]
      );

      if (diff > 0) {
        await db.runAsync(
          `INSERT INTO stock_movements
           (product_id, type, quantity, stock_before, stock_after, note)
           VALUES (?,?,?,?,?,?)`,
          [productId, type, diff, stockBefore, newStock, note]
        );
      }
    });
  }

  async getMonthlySummary() {
    const db = await getDatabase();
    return db.getAllAsync<{
      name: string;
      stok_sekarang: number;
      total_masuk: number;
      total_keluar: number;
      total_adjustment: number;
    }>(
      `SELECT
         p.name,
         p.stock AS stok_sekarang,
         SUM(CASE WHEN sm.type = 'in'         THEN sm.quantity ELSE 0 END) AS total_masuk,
         SUM(CASE WHEN sm.type = 'out'        THEN sm.quantity ELSE 0 END) AS total_keluar,
         SUM(CASE WHEN sm.type = 'adjustment' THEN sm.quantity ELSE 0 END) AS total_adjustment
       FROM products p
       LEFT JOIN stock_movements sm ON sm.product_id = p.id
         AND sm.created_at >= datetime('now', 'start of month', '+7 hours')
       WHERE p.is_active = 1
       GROUP BY p.id, p.name, p.stock
       ORDER BY total_keluar DESC`
    );
  }
}
