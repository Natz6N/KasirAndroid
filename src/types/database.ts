export interface Category {
  id: number;
  uuid: string;
  name: string;
  color_hex: string;
  icon: string;
  sort_order: number;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  uuid: string;
  category_id: number | null;
  category_name?: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  image_uri: string | null;
  description: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'other';
export type TransactionStatus = 'completed' | 'cancelled' | 'pending';
export type StockMovementType = 'in' | 'out' | 'adjustment' | 'return';

export interface Transaction {
  id: number;
  uuid: string;
  invoice_number: string;
  status: TransactionStatus;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  total_cost: number;
  payment_method: PaymentMethod;
  payment_amount: number;
  change_amount: number;
  note: string | null;
  cashier_name: string;
  transaction_date: string;
  created_at: string;
  synced_at: string | null;
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number | null;
  product_snapshot: string;
  product_name: string;
  barcode: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_per_item: number;
  subtotal: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  transaction_item_id: number | null;
  type: StockMovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  note: string | null;
  created_at: string;
}

export interface AppSettings {
  id: 1;
  store_name: string;
  store_address: string | null;
  store_phone: string | null;
  store_logo: string | null;
  admin_pin: string;
  currency: string;
  tax_percent: number;
  receipt_note: string | null;
  low_stock_threshold: number;
  autolock_minutes: number;
  pin_configured: 0 | 1;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount_per_item: number;
  subtotal: number;
}

export interface CheckoutPayload {
  items: CartItem[];
  discount_amount: number;
  payment_method: PaymentMethod;
  payment_amount: number;
  cashier_name: string;
  note?: string;
}

export interface ProductInput extends Partial<Product> {
  name: string;
  sell_price: number;
}

export type ExpenseCategory = 'listrik' | 'sewa' | 'gaji' | 'restock' | 'transport' | 'lain';

export interface Expense {
  id: number;
  date: string;
  category: ExpenseCategory;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface DailySalesRow {
  tanggal: string;
  jumlah_transaksi: number;
  total_penjualan: number;
  total_hpp: number;
  gross_profit: number;
  margin_persen: number;
}

export interface TopProductRow {
  product_id: number;
  product_name: string;
  total_terjual: number;
  total_revenue: number;
  total_hpp: number;
  total_profit: number;
}
