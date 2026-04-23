import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('omah_krupuk.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA cache_size = -8000;
    PRAGMA temp_store = MEMORY;
    PRAGMA mmap_size = 268435456;
  `);
  await runMigrations(_db);
  return _db;
}

const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid        TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(4))) || '-' ||
                    lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) ||
                    '-' || substr('89ab', abs(random()) % 4 + 1, 1) ||
                    substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        name        TEXT    NOT NULL UNIQUE CHECK(length(name) <= 100),
        color_hex   TEXT    NOT NULL DEFAULT '#6366F1',
        icon        TEXT    NOT NULL DEFAULT 'tag',
        sort_order  INTEGER NOT NULL DEFAULT 0,
        is_active   INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS products (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid        TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name        TEXT    NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
        sku         TEXT    UNIQUE,
        barcode     TEXT    UNIQUE,
        buy_price   INTEGER NOT NULL DEFAULT 0 CHECK(buy_price >= 0),
        sell_price  INTEGER NOT NULL CHECK(sell_price >= 0),
        stock       INTEGER NOT NULL DEFAULT 0,
        min_stock   INTEGER NOT NULL DEFAULT 5 CHECK(min_stock >= 0),
        unit        TEXT    NOT NULL DEFAULT 'pcs',
        image_uri   TEXT,
        description TEXT,
        is_active   INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid             TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
        invoice_number   TEXT    NOT NULL UNIQUE,
        status           TEXT    NOT NULL DEFAULT 'completed'
                         CHECK(status IN ('completed','cancelled','pending')),
        subtotal         INTEGER NOT NULL CHECK(subtotal >= 0),
        discount_amount  INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
        total_amount     INTEGER NOT NULL CHECK(total_amount >= 0),
        total_cost       INTEGER NOT NULL DEFAULT 0,
        payment_method   TEXT    NOT NULL CHECK(payment_method IN ('cash','qris','transfer','other')),
        payment_amount   INTEGER NOT NULL CHECK(payment_amount >= 0),
        change_amount    INTEGER NOT NULL DEFAULT 0,
        note             TEXT,
        cashier_name     TEXT    NOT NULL DEFAULT 'Kasir',
        transaction_date TEXT    NOT NULL,
        created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        synced_at        TEXT
      );

      CREATE TABLE IF NOT EXISTS transaction_items (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id    INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        product_id        INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_snapshot  TEXT    NOT NULL,
        product_name      TEXT    NOT NULL,
        barcode           TEXT,
        quantity          INTEGER NOT NULL CHECK(quantity >= 1),
        unit_price        INTEGER NOT NULL CHECK(unit_price >= 0),
        unit_cost         INTEGER NOT NULL DEFAULT 0 CHECK(unit_cost >= 0),
        discount_per_item INTEGER NOT NULL DEFAULT 0 CHECK(discount_per_item >= 0),
        subtotal          INTEGER NOT NULL CHECK(subtotal >= 0)
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id          INTEGER NOT NULL REFERENCES products(id),
        transaction_item_id INTEGER REFERENCES transaction_items(id) ON DELETE SET NULL,
        type                TEXT    NOT NULL CHECK(type IN ('in','out','adjustment','return')),
        quantity            INTEGER NOT NULL CHECK(quantity > 0),
        stock_before        INTEGER NOT NULL,
        stock_after         INTEGER NOT NULL,
        note                TEXT,
        created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id                  INTEGER PRIMARY KEY CHECK(id = 1),
        store_name          TEXT    NOT NULL DEFAULT 'Omah Krupuk',
        store_address       TEXT,
        store_phone         TEXT,
        store_logo          TEXT,
        admin_pin           TEXT    NOT NULL DEFAULT '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        currency            TEXT    NOT NULL DEFAULT 'IDR',
        tax_percent         INTEGER NOT NULL DEFAULT 0,
        receipt_note        TEXT    DEFAULT 'Terima kasih sudah belanja di Omah Krupuk!',
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      INSERT OR IGNORE INTO app_settings (id) VALUES (1);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode   ON products(barcode) WHERE barcode IS NOT NULL;
      CREATE        INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
      CREATE        INDEX IF NOT EXISTS idx_products_active    ON products(is_active);
      CREATE        INDEX IF NOT EXISTS idx_products_stock     ON products(stock);
      CREATE        INDEX IF NOT EXISTS idx_tx_date            ON transactions(transaction_date);
      CREATE        INDEX IF NOT EXISTS idx_tx_status          ON transactions(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_invoice         ON transactions(invoice_number);
      CREATE        INDEX IF NOT EXISTS idx_txi_tx_id          ON transaction_items(transaction_id);
      CREATE        INDEX IF NOT EXISTS idx_txi_product_id     ON transaction_items(product_id);
      CREATE        INDEX IF NOT EXISTS idx_stock_product      ON stock_movements(product_id, created_at);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS expenses (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT    NOT NULL,
        category    TEXT    NOT NULL CHECK(category IN ('listrik','sewa','gaji','restock','transport','lain')),
        amount      INTEGER NOT NULL CHECK(amount > 0),
        note        TEXT,
        created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

      ALTER TABLE app_settings ADD COLUMN autolock_minutes INTEGER NOT NULL DEFAULT 5;
      ALTER TABLE app_settings ADD COLUMN pin_configured   INTEGER NOT NULL DEFAULT 1;
    `,
  },
  {
    version: 3,
    sql: `
      UPDATE app_settings
      SET pin_configured = 0
      WHERE id = 1
        AND admin_pin = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
    `,
  },
];

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT    NOT NULL
    );
  `);
  const result = await db.getFirstAsync<{ max_v: number }>(
    'SELECT COALESCE(MAX(version), 0) AS max_v FROM _migrations'
  );
  const current = result?.max_v ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(m.sql);
        await db.runAsync(
          'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
          [m.version, new Date().toISOString()]
        );
      });
    }
  }
}

export async function checkIntegrity(): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ integrity_check: string }>(
    'PRAGMA integrity_check'
  );
  return result?.integrity_check === 'ok';
}

export async function recoverPendingTransactions(): Promise<void> {
  const db = await getDatabase();
  const pending = await db.getAllAsync<{ id: number }>(
    "SELECT id FROM transactions WHERE status = 'pending'"
  );
  for (const tx of pending) {
    await db.withTransactionAsync(async () => {
      const items = await db.getAllAsync<{ id: number; product_id: number }>(
        'SELECT id, product_id FROM transaction_items WHERE transaction_id = ?',
        [tx.id]
      );
      for (const item of items) {
        if (item.product_id == null) continue;
        const movement = await db.getFirstAsync<{ stock_before: number }>(
          'SELECT stock_before FROM stock_movements WHERE transaction_item_id = ? ORDER BY id DESC LIMIT 1',
          [item.id]
        );
        if (movement) {
          await db.runAsync(
            "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
            [movement.stock_before, item.product_id]
          );
        }
      }
      await db.runAsync(
        "UPDATE transactions SET status = 'cancelled' WHERE id = ?",
        [tx.id]
      );
    });
  }
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}

export async function resetDatabase(): Promise<SQLite.SQLiteDatabase> {
  await closeDatabase();
  return getDatabase();
}

export async function isPinConfigured(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ pin_configured: number }>(
    'SELECT pin_configured FROM app_settings WHERE id = 1'
  );
  return row?.pin_configured === 1;
}
