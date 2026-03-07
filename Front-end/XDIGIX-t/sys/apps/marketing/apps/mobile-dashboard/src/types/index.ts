export type OrderStatus =
  | 'pending'
  | 'preparing_for_pickup'
  | 'ready_for_pickup'
  | 'shipped'
  | 'processing'
  | 'delivered'
  | 'completed'
  | 'returned'
  | 'damaged'
  | 'cancelled';

export type Order = {
  id: string;
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  status: OrderStatus;
  productCount: number;
  total: number;
  date?: string;
  notes?: string;
  paymentStatus?: string;
  channel?: string;
  createdAt?: string;
  updatedAt?: string;
  shippingAddress?: {
    address?: string;
    city?: string;
    district?: string;
    floor?: string;
    apartment?: string;
    building?: string;
  };
  items?: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingFees?: number;
  discount?: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  bostaTrackingNumber?: string;
  bostaStatus?: string;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  sellingPrice?: number;
  sku?: string;
  lowStockAlert?: number;
  stock?: Record<string, number>;
  barcode?: string;
  sizeBarcodes?: Record<string, string>;
  stockByLocation?: Record<string, number>;
  status?: string;
  storageLocation?: string;
  images?: string[];
  createdAt?: string;
};

export type ExpenseCategory =
  | 'shipping'
  | 'marketing'
  | 'supplies'
  | 'rent'
  | 'salary'
  | 'utilities'
  | 'other';

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  vendor?: string;
  receiptUrl?: string;
  createdAt?: string;
};

export type Deposit = {
  id: string;
  amount: number;
  source: string;
  description?: string;
  date: string;
  reference?: string;
  createdAt?: string;
};

export type DashboardStats = {
  totalSales: number;
  orders: number;
  customers: number;
  products: number;
};

export type FinanceOverview = {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  totalDeposits: number;
};

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
};

export type BusinessInfo = {
  businessId: string;
  businessName: string;
  currency: string;
  role: string;
  permissions: Record<string, string[]>;
};
