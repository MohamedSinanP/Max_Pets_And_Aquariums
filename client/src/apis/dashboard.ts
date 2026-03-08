// ─────────────────────────────────────────────────────────────
//  dashboard.api.ts
//  All API calls for the Dashboard page
// ─────────────────────────────────────────────────────────────

import api from "./api"; // your existing axios instance

/* ══════════════════════════════════════════
   RESPONSE TYPES
══════════════════════════════════════════ */

export interface ApiSuccess<T = null> {
  success: boolean;
  message: string;
  data?: T;
}

// ── Stats (Row 1) ──────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  monthVsLast: number;   // % change, can be negative
  totalRevenue: number;
  totalProfit: number;
  ordersToday: number;
  ordersTodayByStatus: {
    pending: number;
    confirmed: number;
    ready: number;
    delivered: number;
    cancelled: number;
  };
  lowStockCount: number;
  activeProducts: number;
  totalProducts: number;
  categoryCount: number;
}

// ── Revenue Chart (Row 2 left) ─────────────────────────────

export interface RevenueChartPoint {
  date: string;   // "YYYY-MM-DD"
  revenue: number;
  orders: number;
}

export interface RevenueChartData {
  from: string;
  to: string;
  chartData: RevenueChartPoint[];
}

// ── Order Status Donut (Row 2 right) ──────────────────────

export interface OrderStatusData {
  pending: number;
  confirmed: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

// ── Recent Orders (Row 3 left) ────────────────────────────

export interface RecentOrder {
  _id: string;
  orderNumber: string;
  customer: { name: string; phone: string; email?: string } | null;
  itemCount: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  orderStatus: string;
  createdAt: string;
}

// ── Top Products (Row 3 right) ────────────────────────────

export interface TopProduct {
  _id: string;
  name: string;
  type: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  isActive: boolean;
}

// ── Low Stock (Row 4 left) ────────────────────────────────

export interface LowStockItem {
  productId: string;
  productName: string;
  category: string;
  variantId: string;
  sku: string;
  attributes: Record<string, string>;
  inStock: number;
  baseUnit: string;
  sellMode: string;
  sellingPrice: number;
  priceUnit: string;
}

export interface LowStockData {
  threshold: number;
  total: number;
  items: LowStockItem[];
}

// ── Payment Summary (Row 4 right) ─────────────────────────

export interface PaymentStatusEntry { total: number; count: number; }
export interface PaymentSummaryData {
  byStatus: Record<"pending" | "paid" | "partial" | "refunded", PaymentStatusEntry>;
  byMethod: Record<"cash" | "card" | "online" | "other", PaymentStatusEntry>;
}

/* ══════════════════════════════════════════
   API FUNCTIONS
══════════════════════════════════════════ */

/** Row 1 — stat cards */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get<ApiSuccess<DashboardStats>>("/dashboard/stats");
  return res.data.data!;
};

/** Row 2 left — revenue line chart */
export const getRevenueChart = async (
  from?: string,
  to?: string
): Promise<RevenueChartData> => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.get<ApiSuccess<RevenueChartData>>("/dashboard/revenue-chart", { params });
  return res.data.data!;
};

/** Row 2 right — order status donut */
export const getOrderStatus = async (): Promise<OrderStatusData> => {
  const res = await api.get<ApiSuccess<OrderStatusData>>("/dashboard/order-status");
  return res.data.data!;
};

/** Row 3 left — recent orders list */
export const getRecentOrders = async (limit = 8): Promise<RecentOrder[]> => {
  const res = await api.get<ApiSuccess<RecentOrder[]>>("/dashboard/recent-orders", {
    params: { limit },
  });
  return res.data.data!;
};

/** Row 3 right — top products bar */
export const getTopProducts = async (limit = 5): Promise<TopProduct[]> => {
  const res = await api.get<ApiSuccess<TopProduct[]>>("/dashboard/top-products", {
    params: { limit },
  });
  return res.data.data!;
};

/** Row 4 left — low stock table */
export const getLowStock = async (
  threshold = 5,
  limit = 10
): Promise<LowStockData> => {
  const res = await api.get<ApiSuccess<LowStockData>>("/dashboard/low-stock", {
    params: { threshold, limit },
  });
  return res.data.data!;
};

/** Row 4 right — payment summary */
export const getPaymentSummary = async (): Promise<PaymentSummaryData> => {
  const res = await api.get<ApiSuccess<PaymentSummaryData>>("/dashboard/payment-summary");
  return res.data.data!;
};