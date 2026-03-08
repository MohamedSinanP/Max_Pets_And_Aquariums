// ─────────────────────────────────────────────
//  orders.types.ts
//  Shared types for Order Management (frontend)
// ─────────────────────────────────────────────

import type { BaseUnit, PriceUnit, ProductCategory, SellMode } from "./product";

export type OrderStatus = "pending" | "confirmed" | "ready" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";
export type PaymentMethod = "cash" | "card" | "online" | "other";

// ── Order item (as stored / returned by API) ──────────────────────────────

export interface OrderItemProduct {
  _id: string;
  name: string;
  image?: string;
  category?: ProductCategory | null;
}

export interface OrderItem {
  _id?: string;
  // product can be a plain id string OR a populated object
  product: string | OrderItemProduct;
  variant: string;
  quantity: number;
  unit: BaseUnit;
  sellMode: SellMode;
  priceUnit: PriceUnit;
  unitPrice: number;
  subtotal: number;
}

// ── Customer ──────────────────────────────────────────────────────────────

export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string | null;
}

// ── Order (full, as returned by API) ──────────────────────────────────────

export interface Order {
  _id: string;
  id: string;
  orderNumber: string;
  customer: OrderCustomer | null;
  items: OrderItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Generic API response envelope ─────────────────────────────────────────

export interface ApiSuccess<T = null> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
}
export interface TopPerformingProductStat {
  productId: string;
  name: string;
  totalSoldQty: number;
}

export interface OrderStatistics {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  paidPercentage: number;
  topPerformingProducts: TopPerformingProductStat[];
}

export interface PaginatedOrderResponse {
  orders: Order[];
  pagination: PaginationMeta;
  statistics: OrderStatistics;
}

// ── Query params ───────────────────────────────────────────────────────────

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  orderStatus?: OrderStatus | "";
  paymentStatus?: PaymentStatus | "";
  from?: string;
  to?: string;
  phone?: string;
}

// ── Create / Update payloads ───────────────────────────────────────────────

export interface CreateOrderItemPayload {
  product: string;
  variant: string;
  quantity: number;
  unit?: BaseUnit;
  sellMode?: SellMode;
  priceUnit?: PriceUnit;
}

export interface CreateOrderPayload {
  customer?: OrderCustomer | null;
  items: CreateOrderItemPayload[];
  discount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
}

export interface UpdateOrderStatusPayload {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

// ── Cart item (internal UI state — NOT sent to API directly) ──────────────

export interface CartItem {
  /** composite key: `${productId}__${variantId}` */
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  sellMode: SellMode;
  unit: BaseUnit;
  priceUnit: PriceUnit;
  unitPrice: number;
  quantity: number;
  variantStock: number;
  subtotal: number;
}

// ── Status config maps (UI helpers) ───────────────────────────────────────

export interface StatusConfig {
  label: string;
  bg: string;
  color: string;
  dot?: string;
  icon?: string;
}

export type OrderStatusConfigMap = Record<OrderStatus, StatusConfig>;
export type PaymentStatusConfigMap = Record<PaymentStatus, StatusConfig>;