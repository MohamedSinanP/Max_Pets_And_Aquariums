import api from "./api";

/* =========================
   Types
========================= */

export type OrderStatus = "pending" | "confirmed" | "ready" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";
export type PaymentMethod = "cash" | "card" | "online" | "other";
export type SellMode = "packaged" | "loose";
export type ItemUnit = "pcs" | "g" | "ml";

export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string | null;
}

export interface OrderItem {
  _id?: string;
  product: string | { _id: string; name: string; image?: string; category?: string };
  variant: string;
  quantity: number;
  unit: ItemUnit;
  sellMode: SellMode;
  unitPrice: number;
  subtotal: number;
}

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
  receiptPrinted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccess<T = null> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedOrderResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/* =========================
   Query Params
========================= */

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  orderStatus?: OrderStatus | "";
  paymentStatus?: PaymentStatus | "";
  from?: string; // ISO date string
  to?: string;   // ISO date string
  phone?: string;
}

/* =========================
   Payloads
========================= */

export interface CreateOrderItemPayload {
  product: string;
  variant: string;
  quantity: number;
  unit: ItemUnit;
  sellMode: SellMode;
}

export interface CreateOrderPayload {
  customer?: OrderCustomer | null;
  items: CreateOrderItemPayload[];
  discount?: number;
  paymentMethod: PaymentMethod;
}

export interface UpdateOrderStatusPayload {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

/* =========================
   Helpers
========================= */

const toQueryParams = (params?: GetOrdersParams) => {
  if (!params) return undefined;
  const q: Record<string, string> = {};
  if (params.page != null) q.page = String(params.page);
  if (params.limit != null) q.limit = String(params.limit);
  if (params.search?.trim()) q.search = params.search.trim();
  if (params.orderStatus) q.orderStatus = params.orderStatus;
  if (params.paymentStatus) q.paymentStatus = params.paymentStatus;
  if (params.from) q.from = params.from;
  if (params.to) q.to = params.to;
  if (params.phone?.trim()) q.phone = params.phone.trim();
  return q;
};

/* =========================
   API Functions
========================= */

/**
 * POST /api/orders
 * Creates a new order. Validates stock, deducts inventory.
 */
export const createOrder = async (payload: CreateOrderPayload) => {
  const res = await api.post<ApiSuccess<Order>>("/orders", payload);
  return res.data;
};

/**
 * PATCH /api/orders/:id/status
 * Updates orderStatus and/or paymentStatus.
 * Restores stock if order is cancelled or payment refunded.
 */
export const updateOrderStatus = async (
  id: string,
  payload: UpdateOrderStatusPayload
) => {
  const res = await api.patch<ApiSuccess<Order>>(`/orders/${id}/status`, payload);
  return res.data;
};

/**
 * GET /api/orders
 * Fetches paginated orders with optional filters.
 */
export const getOrders = async (params?: GetOrdersParams) => {
  const res = await api.get<ApiSuccess<PaginatedOrderResponse>>("/orders", {
    params: toQueryParams(params),
  });
  return res.data;
};

/**
 * GET /api/orders/:id
 * Fetches a single order with populated product details.
 */
export const getOrderById = async (id: string) => {
  const res = await api.get<ApiSuccess<Order>>(`/orders/${id}`);
  return res.data;
};