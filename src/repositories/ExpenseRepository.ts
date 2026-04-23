import { getDatabase } from '../database/db';
import type { Expense, ExpenseCategory } from '../types/database';

export class ExpenseRepository {
  async findAll(startDate?: string, endDate?: string): Promise<Expense[]> {
    const db = await getDatabase();
    if (startDate && endDate) {
      return db.getAllAsync<Expense>(
        `SELECT * FROM expenses WHERE date >= ? AND date < ? ORDER BY date DESC, created_at DESC`,
        [startDate, endDate]
      );
    }
    return db.getAllAsync<Expense>(
      'SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT 100'
    );
  }

  async create(
    date: string,
    category: ExpenseCategory,
    amount: number,
    note: string | null
  ): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO expenses (date, category, amount, note) VALUES (?,?,?,?)`,
      [date, category, amount, note]
    );
    return result.lastInsertRowId;
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  }

  async getSummaryByCategory(startDate: string, endDate: string) {
    const db = await getDatabase();
    return db.getAllAsync<{ category: ExpenseCategory; total: number; count: number }>(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count
       FROM expenses
       WHERE date >= ? AND date < ?
       GROUP BY category
       ORDER BY total DESC`,
      [startDate, endDate]
    );
  }

  async getTotalForPeriod(startDate: string, endDate: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date >= ? AND date < ?`,
      [startDate, endDate]
    );
    return row?.total ?? 0;
  }

  async getTodayTotal(): Promise<number> {
    const db = await getDatabase();
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const tomorrow = new Date(new Date().getTime() + 86400000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date >= ? AND date < ?`,
      [today, tomorrow]
    );
    return row?.total ?? 0;
  }
}
