import { getDatabase } from '../database/db';
import type { Product, ProductInput } from '../types/database';

export class ProductRepository {
  async findByBarcode(barcode: string): Promise<Product | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Product>(
      `SELECT p.*, c.name AS category_name, c.color_hex
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = ? AND p.is_active = 1
       LIMIT 1`,
      [barcode]
    );
  }

  async findById(id: number): Promise<Product | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Product>(
      `SELECT p.*, c.name AS category_name, c.color_hex
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
      [id]
    );
  }

  async findAll(includeInactive = false): Promise<Product[]> {
    const db = await getDatabase();
    const where = includeInactive ? '' : 'WHERE p.is_active = 1';
    return db.getAllAsync<Product>(
      `SELECT p.*, c.name AS category_name, c.color_hex
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY c.sort_order ASC, p.name ASC`
    );
  }

  async search(query: string): Promise<Product[]> {
    const db = await getDatabase();
    const q = `%${query}%`;
    return db.getAllAsync<Product>(
      `SELECT p.*, c.name AS category_name, c.color_hex
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1
         AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
       ORDER BY p.name ASC
       LIMIT 50`,
      [q, q, q]
    );
  }

  async findByCategory(categoryId: number): Promise<Product[]> {
    const db = await getDatabase();
    return db.getAllAsync<Product>(
      `SELECT p.*, c.name AS category_name, c.color_hex
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND p.category_id = ?
       ORDER BY p.name ASC`,
      [categoryId]
    );
  }

  async getLowStock(): Promise<Product[]> {
    const db = await getDatabase();
    return db.getAllAsync<Product>(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND p.stock <= p.min_stock
       ORDER BY p.stock ASC`
    );
  }

  async upsert(product: ProductInput): Promise<number> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    if (product.id) {
      await db.runAsync(
        `UPDATE products
         SET name=?, category_id=?, sku=?, barcode=?, buy_price=?, sell_price=?,
             min_stock=?, unit=?, description=?, image_uri=?, updated_at=?
         WHERE id=?`,
        [
          product.name,
          product.category_id ?? null,
          product.sku ?? null,
          product.barcode ?? null,
          product.buy_price ?? 0,
          product.sell_price,
          product.min_stock ?? 5,
          product.unit ?? 'pcs',
          product.description ?? null,
          product.image_uri ?? null,
          now,
          product.id,
        ]
      );
      return product.id;
    }
    const result = await db.runAsync(
      `INSERT INTO products
       (name, category_id, sku, barcode, buy_price, sell_price,
        stock, min_stock, unit, description, image_uri, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        product.name,
        product.category_id ?? null,
        product.sku ?? null,
        product.barcode ?? null,
        product.buy_price ?? 0,
        product.sell_price,
        product.stock ?? 0,
        product.min_stock ?? 5,
        product.unit ?? 'pcs',
        product.description ?? null,
        product.image_uri ?? null,
        now,
        now,
      ]
    );
    return result.lastInsertRowId;
  }

  async softDelete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE products SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      [id]
    );
  }

  async updateStock(id: number, newStock: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      [newStock, id]
    );
  }

  async checkBarcodeExists(barcode: string, excludeId?: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM products
       WHERE barcode = ? AND (? IS NULL OR id != ?) AND is_active = 1`,
      [barcode, excludeId ?? null, excludeId ?? null]
    );
    return (result?.count ?? 0) > 0;
  }
}
