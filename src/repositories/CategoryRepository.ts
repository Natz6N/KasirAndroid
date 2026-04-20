import { getDatabase } from '../database/db';
import type { Category } from '../types/database';

export class CategoryRepository {
  async findAll(includeInactive = false): Promise<Category[]> {
    const db = await getDatabase();
    const where = includeInactive ? '' : 'WHERE is_active = 1';
    return db.getAllAsync<Category>(
      `SELECT * FROM categories ${where} ORDER BY sort_order ASC, name ASC`
    );
  }

  async findById(id: number): Promise<Category | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  }

  async upsert(category: Partial<Category> & { name: string }): Promise<number> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    if (category.id) {
      await db.runAsync(
        `UPDATE categories
         SET name=?, color_hex=?, icon=?, sort_order=?, updated_at=?
         WHERE id=?`,
        [
          category.name,
          category.color_hex ?? '#6366F1',
          category.icon ?? 'tag',
          category.sort_order ?? 0,
          now,
          category.id,
        ]
      );
      return category.id;
    }
    const result = await db.runAsync(
      `INSERT INTO categories (name, color_hex, icon, sort_order, created_at, updated_at)
       VALUES (?,?,?,?,?,?)`,
      [
        category.name,
        category.color_hex ?? '#6366F1',
        category.icon ?? 'tag',
        category.sort_order ?? 0,
        now,
        now,
      ]
    );
    return result.lastInsertRowId;
  }

  async softDelete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE categories SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      [id]
    );
  }
}
