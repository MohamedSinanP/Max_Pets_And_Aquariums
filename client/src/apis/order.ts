// ─────────────────────────────────────────────
//  orders.api.ts
//  Real API calls for Order Management
// ─────────────────────────────────────────────

import api from "./api"; // your axios instance
import type {
  ApiSuccess,
  CreateOrderPayload,
  GetOrdersParams,
  Order,
  PaginatedOrderResponse,
  UpdateOrderStatusPayload,
} from "../types/order";

// ── Helpers ────────────────────────────────────────────────────────────────

const toQueryParams = (params?: GetOrdersParams): Record<string, string> | undefined => {
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

// ── API Functions ──────────────────────────────────────────────────────────

/**
 * GET /api/orders
 * Paginated order list with optional filters.
 */
export const getOrders = async (
  params?: GetOrdersParams
): Promise<ApiSuccess<PaginatedOrderResponse>> => {
  const res = await api.get<ApiSuccess<PaginatedOrderResponse>>("/orders", {
    params: toQueryParams(params),
  });
  return res.data;
};

/**
 * GET /api/orders/:id
 * Single order with populated product + category.
 */
export const getOrderById = async (id: string): Promise<ApiSuccess<Order>> => {
  const res = await api.get<ApiSuccess<Order>>(`/orders/${id}`);
  return res.data;
};

/**
 * POST /api/orders
 * Creates a new order. Validates stock, deducts inventory, returns order.
 */
export const createOrder = async (
  payload: CreateOrderPayload
): Promise<ApiSuccess<Order>> => {
  const res = await api.post<ApiSuccess<Order>>("/orders", payload);
  return res.data;
};

/**
 * PATCH /api/orders/:id/status
 * Updates orderStatus and/or paymentStatus.
 * Automatically restores stock when order is cancelled or payment refunded.
 */
export const updateOrderStatus = async (
  id: string,
  payload: UpdateOrderStatusPayload
): Promise<ApiSuccess<Order>> => {
  const res = await api.patch<ApiSuccess<Order>>(`/orders/${id}/status`, payload);
  return res.data;
};