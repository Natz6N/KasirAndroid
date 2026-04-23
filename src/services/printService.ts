import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { formatRupiah } from '../utils/formatCurrency';
import { formatDisplayDateTime } from '../utils/dateHelper';
import type { CartItem, PaymentMethod, TransactionItem } from '../types/database';

const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
    other: 'Lainnya',
};

export interface ReceiptData {
    invoiceNumber: string;
    transactionDate?: string;
    items: CartItem[] | ReceiptItemData[];
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    paymentAmount: number;
    changeAmount: number;
    storeName: string;
    storeAddress?: string | null;
    storePhone?: string | null;
    receiptNote?: string | null;
}

export interface ReceiptItemData {
    product_name?: string;
    product?: { name: string; sell_price: number };
    quantity: number;
    unit_price?: number;
    subtotal: number;
}

function getItemName(item: CartItem | ReceiptItemData): string {
    if ('product' in item && item.product) return item.product.name;
    if ('product_name' in item && item.product_name) return item.product_name;
    return '-';
}

function getItemUnitPrice(item: CartItem | ReceiptItemData): number {
    if ('product' in item && item.product) return item.product.sell_price;
    if ('unit_price' in item && item.unit_price !== undefined) return item.unit_price;
    return item.subtotal / item.quantity;
}

function generateReceiptHTML(data: ReceiptData): string {
    const dateStr = data.transactionDate
        ? formatDisplayDateTime(data.transactionDate)
        : formatDisplayDateTime(new Date().toISOString());

    const itemsHTML = data.items
        .map((item) => {
            const name = getItemName(item);
            const unitPrice = getItemUnitPrice(item);
            return `
        <tr>
          <td class="item-name" colspan="2">${name}</td>
        </tr>
        <tr>
          <td class="item-qty">${item.quantity} × ${formatRupiah(unitPrice)}</td>
          <td class="item-total">${formatRupiah(item.subtotal)}</td>
        </tr>`;
        })
        .join('');

    const discountRow =
        data.discountAmount > 0
            ? `<tr><td class="sum-label">Diskon</td><td class="sum-value discount">- ${formatRupiah(data.discountAmount)}</td></tr>`
            : '';

    const changeRow =
        data.paymentMethod === 'cash' && data.changeAmount >= 0
            ? `<tr><td class="sum-label">Kembalian</td><td class="sum-value change">${formatRupiah(data.changeAmount)}</td></tr>`
            : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #111;
    background: #fff;
    padding: 16px;
    max-width: 320px;
    margin: 0 auto;
  }
  .store-name {
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 2px;
    letter-spacing: 0.5px;
  }
  .store-meta {
    font-size: 11px;
    text-align: center;
    color: #555;
    margin-bottom: 2px;
  }
  .invoice-no {
    font-size: 11px;
    text-align: center;
    color: #333;
    margin-bottom: 2px;
  }
  .date-time {
    font-size: 11px;
    text-align: center;
    color: #777;
  }
  .divider {
    border-top: 1px dashed #aaa;
    margin: 10px 0;
  }
  .divider-solid {
    border-top: 2px solid #111;
    margin: 10px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  .item-name {
    font-weight: 600;
    font-size: 13px;
    padding-top: 6px;
    padding-bottom: 0px;
  }
  .item-qty {
    color: #555;
    font-size: 12px;
    padding-bottom: 6px;
    padding-left: 8px;
  }
  .item-total {
    text-align: right;
    font-weight: 600;
    font-size: 13px;
    padding-bottom: 6px;
    white-space: nowrap;
  }
  .sum-label {
    color: #555;
    font-size: 12px;
    padding: 2px 0;
  }
  .sum-value {
    text-align: right;
    font-size: 12px;
    padding: 2px 0;
    white-space: nowrap;
  }
  .discount { color: #c00; }
  .change { color: #007700; font-weight: 700; }
  .total-row { border-top: 1px solid #aaa; padding-top: 8px; }
  .total-label {
    font-size: 16px;
    font-weight: 700;
    padding: 4px 0;
  }
  .total-value {
    font-size: 18px;
    font-weight: 700;
    text-align: right;
    color: #4F46E5;
    white-space: nowrap;
  }
  .payment-method {
    font-size: 12px;
    color: #555;
    padding: 2px 0;
  }
  .payment-amount {
    font-size: 12px;
    text-align: right;
    padding: 2px 0;
    white-space: nowrap;
  }
  .footer-note {
    text-align: center;
    font-size: 11px;
    color: #777;
    margin-top: 8px;
    line-height: 1.5;
    font-style: italic;
  }
  .footer-tagline {
    text-align: center;
    font-size: 10px;
    color: #aaa;
    margin-top: 6px;
  }
</style>
</head>
<body>
  <p class="store-name">${data.storeName}</p>
  ${data.storeAddress ? `<p class="store-meta">${data.storeAddress}</p>` : ''}
  ${data.storePhone ? `<p class="store-meta">Telp: ${data.storePhone}</p>` : ''}
  <p class="invoice-no">${data.invoiceNumber}</p>
  <p class="date-time">${dateStr}</p>

  <div class="divider"></div>

  <table>
    ${itemsHTML}
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td class="sum-label">Subtotal</td>
      <td class="sum-value">${formatRupiah(data.subtotal)}</td>
    </tr>
    ${discountRow}
    <tr class="total-row">
      <td class="total-label">TOTAL</td>
      <td class="total-value">${formatRupiah(data.totalAmount)}</td>
    </tr>
    <tr>
      <td class="payment-method">${METHOD_LABELS[data.paymentMethod]}</td>
      <td class="payment-amount">${formatRupiah(data.paymentAmount)}</td>
    </tr>
    ${changeRow}
  </table>

  <div class="divider"></div>

  ${data.receiptNote ? `<p class="footer-note">${data.receiptNote}</p>` : ''}
  <p class="footer-tagline">Terima kasih telah berbelanja</p>
</body>
</html>`;
}

export class PrintService {
    /**
     * Generate a PDF receipt and open the share sheet.
     */
    async shareReceiptAsPDF(data: ReceiptData): Promise<void> {
        const html = generateReceiptHTML(data);
        const { uri } = await Print.printToFileAsync({
            html,
            width: 320,
            height: 600,
        });

        // Rename to a friendlier filename
        const dest = `${FileSystem.documentDirectory}struk_${data.invoiceNumber.replace(/\//g, '-')}.pdf`;
        await FileSystem.copyAsync({ from: uri, to: dest });

        await Sharing.shareAsync(dest, {
            mimeType: 'application/pdf',
            dialogTitle: `Struk ${data.invoiceNumber}`,
            UTI: 'com.adobe.pdf',
        });

        // Clean up temp file (keep dest as it may be useful)
        try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch {
            // ignore
        }
    }

    /**
     * Build ReceiptData from transaction items (for sharing from history).
     */
    buildFromTransactionItems(
        params: {
            invoiceNumber: string;
            transactionDate: string;
            items: TransactionItem[];
            subtotal: number;
            discountAmount: number;
            totalAmount: number;
            paymentMethod: PaymentMethod;
            paymentAmount: number;
            changeAmount: number;
            storeName: string;
            storeAddress?: string | null;
            storePhone?: string | null;
            receiptNote?: string | null;
        }
    ): ReceiptData {
        const items: ReceiptItemData[] = params.items.map((i) => ({
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
        }));
        return { ...params, items };
    }
}

export const printService = new PrintService();