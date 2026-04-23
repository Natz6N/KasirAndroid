export type RootStackParamList = {
  MainTabs: undefined;
  Cart: undefined;
  Payment: undefined;
  ProductForm: { productId?: number };
  SalesReport: undefined;
  ProfitReport: undefined;
  StockReport: undefined;
  Transactions: undefined;
  StockManagement: undefined;
  StockHistory: { productId: number; productName: string };
  Categories: undefined;
  Expenses: undefined;
};

export type MainTabParamList = {
  Kasir: undefined;
  Produk: undefined;
  Dashboard: undefined;
  Lainnya: undefined;
};
