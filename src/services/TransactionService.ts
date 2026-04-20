import { getDatabase } from '../database/db';
import { generateInvoiceNumber, getLocalISO } from '../utils/dateHelper';
import type { CheckoutPayload } from '../types/database';

export class StockInsufficientError extends Error {
  constructor(
    public productName: string,
    public available: number,
    public requested: number
  ) {
    super(`Stok ${productName} tidak mencukupi! Tersedia: ${available}, Diminta: ${requested}`);
  }
}

export class TransactionService {
  async checkout(payload: CheckoutPayload): Promise<string> {
    const db = await getDatabase();

    // Validasi stok SEBELUM transaksi dimulai
    for (const item of payload.items) {
      const current = await db.getFirstAsync<{ stock: number }>(
        'SELECT stock FROM products WHERE id = ?',
        [item.product.id]
      );
      if (!current || current.stock < item.quantity) {
        throw new StockInsufficientError(
          item.product.name,
          current?.stock ?? 0,
          item.quantity
        );
      }
    }

    const subtotal = payload.items.reduce((s, i) => s + i.subtotal, 0);
    const totalCost = payload.items.reduce(
      (s, i) => s + i.product.buy_price * i.quantity,
      0
    );
    const totalAmount = subtotal - payload.discount_amount;
    const changeAmount = payload.payment_amount - totalAmount;
    const invoiceNumber = await generateInvoiceNumber(db);
    const transactionDate = getLocalISO();

    await db.withTransactionAsync(async () => {
      const txResult = await db.runAsync(
        `INSERT INTO transactions
         (invoice_number, status, subtotal, discount_amount, total_amount,
          total_cost, payment_method, payment_amount, change_amount,
          cashier_name, note, transaction_date)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          invoiceNumber,
          'completed',
          subtotal,
          payload.discount_amount,
          totalAmount,
          totalCost,
          payload.payment_method,
          payload.payment_amount,
          changeAmount,
          payload.cashier_name,
          payload.note ?? null,
          transactionDate,
        ]
      );
      const transactionId = txResult.lastInsertRowId;

      for (const item of payload.items) {
        const snapshot = JSON.stringify({
          name: item.product.name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          buy_price: item.product.buy_price,
          sell_price: item.product.sell_price,
        });

        const itemResult = await db.runAsync(
          `INSERT INTO transaction_items
           (transaction_id, product_id, product_snapshot, product_name,
            barcode, quantity, unit_price, unit_cost, discount_per_item, subtotal)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            transactionId,
            item.product.id,
            snapshot,
            item.product.name,
            item.product.barcode,
            item.quantity,
            item.product.sell_price,
            item.product.buy_price,
            item.discount_per_item,
            item.subtotal,
          ]
        );

        const current = await db.getFirstAsync<{ stock: number }>(
          'SELECT stock FROM products WHERE id = ?',
          [item.product.id]
        );
        const stockBefore = current!.stock;
        const stockAfter = stockBefore - item.quantity;

        await db.runAsync(
          "UPDATE products SET stock = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
          [stockAfter, item.product.id]
        );

        await db.runAsync(
          `INSERT INTO stock_movements
           (product_id, transaction_item_id, type, quantity, stock_before, stock_after)
           VALUES (?,?,?,?,?,?)`,
          [
            item.product.id,
            itemResult.lastInsertRowId,
            'out',
            item.quantity,
            stockBefore,
            stockAfter,
          ]
        );
      }
    });

    return invoiceNumber;
  }
}
