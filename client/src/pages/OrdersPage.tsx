import React, { useState, useEffect, useCallback, useRef } from "react";
import { getOrders } from "../apis/order";
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  PaginationMeta,
  GetOrdersParams,
} from "../types/order";
import { Badge, EmptyState, Select, Spinner, TealBtn } from "../components/orders/OrderUi";
import { SearchBar } from "../components/SearchBar";
import { NewOrderPanel, Pagination } from "../components/orders/NewOrderPanel";
import { UpdateStatusModal } from "../components/orders/UpdateStatusModel";
import { ViewOrderModal } from "../components/orders/viewOrderModal";

/* ─────────────────────────────────────────────────────────────
   RESPONSIVE HOOK
───────────────────────────────────────────────────────────── */

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return mobile;
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
};

const formatAmount = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─────────────────────────────────────────────────────────────
   STATUS CONFIG (used in cards)
───────────────────────────────────────────────────────────── */

const ORDER_STATUS_CFG: Record<string, { bg: string; color: string; dot: string }> = {
  pending: { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  confirmed: { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  ready: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  delivered: { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};
const PAY_STATUS_CFG: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e" },
  paid: { bg: "#d1fae5", color: "#065f46" },
  partial: { bg: "#e0f2fe", color: "#075985" },
  refunded: { bg: "#fce7f3", color: "#9d174d" },
};

/* ─────────────────────────────────────────────────────────────
   MOBILE ORDER CARD
───────────────────────────────────────────────────────────── */

interface OrderCardProps {
  order: Order;
  onView: (o: Order) => void;
  onUpdate: (o: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onView, onUpdate }) => {
  const os = ORDER_STATUS_CFG[order.orderStatus] ?? ORDER_STATUS_CFG.pending;
  const ps = PAY_STATUS_CFG[order.paymentStatus] ?? PAY_STATUS_CFG.pending;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e0f2f1",
      boxShadow: "0 2px 12px rgba(15,118,110,0.06)",
      overflow: "hidden",
      marginBottom: 10,
    }}>
      {/* Top accent stripe — order status colour */}
      <div style={{ height: 3, background: os.dot }} />

      <div style={{ padding: "14px 14px 12px" }}>

        {/* Row 1: order number + timestamp */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 14, color: "#0f766e" }}>
            {order.orderNumber}
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
            {formatDate(order.createdAt)}
          </span>
        </div>

        {/* Row 2: customer chip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 10,
          background: "#f0fdfa", marginBottom: 12,
          border: "1px solid #ccfbf1",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 13, fontWeight: 800,
          }}>
            {order.customer ? order.customer.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f4f4a" }}>
              {order.customer?.name ?? "Walk-in Customer"}
            </p>
            {order.customer?.phone && (
              <p style={{ margin: 0, fontSize: 11, color: "#5eaaa0", fontFamily: "'DM Mono', monospace" }}>
                {order.customer.phone}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: 2×2 detail grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px", marginBottom: 12 }}>

          {/* Amount */}
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Amount
            </p>
            <p style={{ margin: "3px 0 0", fontWeight: 900, fontSize: 15, color: "#0f4f4a", fontFamily: "'DM Mono', monospace" }}>
              {formatAmount(order.finalAmount)}
            </p>
            {order.discount > 0 && (
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>
                {formatAmount(order.totalAmount)}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Items
            </p>
            <p style={{ margin: "3px 0 0", fontWeight: 700, fontSize: 14, color: "#0f4f4a" }}>
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Order status */}
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Order Status
            </p>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 20,
              background: os.bg, color: os.color,
              fontSize: 11, fontWeight: 700, textTransform: "capitalize",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: os.dot, flexShrink: 0 }} />
              {order.orderStatus}
            </span>
          </div>

          {/* Payment status */}
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Payment
            </p>
            <span style={{
              display: "inline-block",
              padding: "3px 9px", borderRadius: 20,
              background: ps.bg, color: ps.color,
              fontSize: 11, fontWeight: 700, textTransform: "capitalize",
            }}>
              {order.paymentStatus}
            </span>
            <p style={{ margin: "3px 0 0", fontSize: 10, color: "#94a3b8", textTransform: "capitalize" }}>
              via {order.paymentMethod}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, borderTop: "1px solid #e0f2f1", paddingTop: 10 }}>
          <button
            onClick={() => onView(order)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10,
              border: "1.5px solid #0d9488", background: "#fff",
              color: "#0d9488", fontSize: 12, fontWeight: 800,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 5,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View
          </button>
          <button
            onClick={() => onUpdate(order)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              color: "#fff", fontSize: 12, fontWeight: 800,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 5,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 3px 10px rgba(15,118,110,0.25)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ORDERS TABLE / CARD LIST
───────────────────────────────────────────────────────────── */

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  paidPercentage: number;
  topPerformingProducts: { productId: string; name: string; totalSoldQty: number }[];
}

interface OrdersTableProps {
  onViewOrder: (order: Order) => void;
  onUpdateStatus: (order: Order) => void;
  refreshKey: number;
  onStatsChange: (stats: OrderStats) => void;
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  onViewOrder,
  onUpdateStatus,
  refreshKey,
  onStatsChange,
}) => {
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const LIMIT = 10;

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetOrdersParams = { page, limit: LIMIT };
      if (search.trim()) params.search = search.trim();
      if (orderStatus) params.orderStatus = orderStatus;
      if (paymentStatus) params.paymentStatus = paymentStatus;

      const res = await getOrders(params);
      setOrders(res.data?.orders ?? []);
      if (res.data?.pagination) setPagination(res.data.pagination);

      if (res.data?.statistics) {
        onStatsChange({
          totalOrders: res.data.statistics.totalOrders ?? 0,
          pendingOrders: res.data.statistics.pendingOrders ?? 0,
          deliveredOrders: res.data.statistics.deliveredOrders ?? 0,
          paidPercentage: res.data.statistics.paidPercentage ?? 0,
          topPerformingProducts: res.data.statistics.topPerformingProducts ?? [],
        });
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, orderStatus, paymentStatus, refreshKey]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  };

  return (
    <div className="bg-white rounded-2xl border border-teal-100 overflow-hidden shadow-sm shadow-teal-50">

      {/* ── Filters header ── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-teal-50 bg-gradient-to-r from-teal-50/60 to-white flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-teal-900 text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            All Orders
          </h3>
          <p className="text-teal-400 text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
            {pagination ? `${pagination.total} total records` : "—"}
          </p>
        </div>
        <SearchBar value={search} onChange={handleSearchChange} placeholder="Order # or customer…" />
        <Select
          value={orderStatus}
          onChange={v => { setOrderStatus(v as OrderStatus | ""); setPage(1); }}
          options={[
            { value: "", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "ready", label: "Ready" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <Select
          value={paymentStatus}
          onChange={v => { setPaymentStatus(v as PaymentStatus | ""); setPage(1); }}
          options={[
            { value: "", label: "All Payment" },
            { value: "pending", label: "Pending" },
            { value: "paid", label: "Paid" },
            { value: "partial", label: "Partial" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
      </div>

      {/* ── MOBILE: card list ── */}
      {isMobile ? (
        <div style={{ padding: "12px 12px 4px" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size={28} />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState message="No orders found." />
          ) : (
            orders.map(order => (
              <OrderCard
                key={order._id}
                order={order}
                onView={onViewOrder}
                onUpdate={onUpdateStatus}
              />
            ))
          )}
        </div>
      ) : (
        /* ── DESKTOP: table ── */
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr className="bg-gradient-to-r from-teal-50 to-teal-50/30">
                {["Order #", "Customer", "Items", "Amount", "Payment", "Status", "Date", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-teal-600 uppercase tracking-wide border-b-2 border-teal-100 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8}><EmptyState message="No orders found." /></td></tr>
              ) : orders.map((order, idx) => (
                <tr key={order._id}
                  className={`border-b border-teal-50 transition-colors hover:bg-teal-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-teal-50/10"}`}>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-teal-700 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {order.orderNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {order.customer ? (
                      <div>
                        <p className="font-semibold text-teal-900 text-sm">{order.customer.name}</p>
                        <p className="text-teal-400 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{order.customer.phone}</p>
                      </div>
                    ) : (
                      <span className="text-teal-300 text-sm italic">Walk-in</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-teal-700 font-semibold">{order.items.length} item(s)</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-black text-teal-900 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                      ₹{order.finalAmount.toFixed(2)}
                    </p>
                    {order.discount > 0 && (
                      <p className="text-xs text-teal-400 line-through">₹{order.totalAmount.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1">
                      <Badge status={order.paymentStatus} type="payment" />
                      <span className="text-teal-400 text-xs capitalize">{order.paymentMethod}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge status={order.orderStatus} type="order" />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-teal-500 whitespace-nowrap">{formatDate(order.createdAt)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onViewOrder(order)}
                        className="p-1.5 rounded-lg text-teal-400 hover:text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-all"
                        title="View Order">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button onClick={() => onUpdateStatus(order)}
                        className="p-1.5 rounded-lg text-teal-400 hover:text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-all"
                        title="Update Status">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={LIMIT}
          onChange={setPage}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */

const OrdersPage: React.FC = () => {
  const isMobile = useIsMobile();

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0, pendingOrders: 0,
    deliveredOrders: 0, paidPercentage: 0,
    topPerformingProducts: [],
  });

  const handleOrderCreated = () => {
    setRefreshKey(k => k + 1);
    setOrderCreated(true);
    setTimeout(() => setOrderCreated(false), 3000);
  };

  const handleStatusUpdated = () => {
    setUpdatingOrder(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-teal-50/20"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        /**
         * ✅ HAMBURGER OVERLAP FIX
         * The Sidebar renders a fixed hamburger at  { top:16px, left:16px, height:42px }
         * giving a total occupied height of ~58px on mobile.
         * We use 84px top padding (same as CategoryManagement) to keep the page
         * heading safely below it, with extra breathing room.
         * On desktop (≥768px) the sidebar is always in the DOM so no offset needed.
         */
        padding: isMobile ? "84px 16px 24px" : "24px",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-teal-900 tracking-tight">Orders</h1>
          <p className="text-teal-500 mt-1 text-sm">Manage and track all customer orders</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {orderCreated && (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold px-4 py-2 rounded-xl animate-fade-in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Order created!
            </div>
          )}
          <TealBtn onClick={() => setShowNewOrder(true)} size="lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
            </svg>
            New Order
          </TealBtn>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Orders", value: stats.totalOrders, icon: "📦", accent: "from-teal-50 to-white border-teal-100" },
          { label: "Pending", value: stats.pendingOrders, icon: "⏳", accent: "from-amber-50 to-white border-amber-100" },
          { label: "Delivered", value: stats.deliveredOrders, icon: "✅", accent: "from-green-50 to-white border-green-100" },
          { label: "Paid %", value: `${stats.paidPercentage}%`, icon: "💳", accent: "from-teal-50 to-white border-teal-100" },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.accent} border rounded-2xl p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-black text-teal-900 mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {s.value}
                </p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Top Performing Products ── */}
      <div className="bg-white rounded-2xl border border-teal-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-teal-900">Top Performing Products</h3>
          <span className="text-xs text-teal-400">Overall orders</span>
        </div>
        {stats.topPerformingProducts.length === 0 ? (
          <p className="text-sm text-teal-400">No product statistics available.</p>
        ) : (
          <div className="space-y-2">
            {stats.topPerformingProducts.map((item, index) => (
              <div key={item.productId}
                className="flex items-center justify-between rounded-xl border border-teal-50 px-4 py-3 bg-teal-50/30">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-teal-900 truncate">{item.name}</p>
                    <p className="text-xs text-teal-400">Product ID: {item.productId}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-black text-teal-800" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {item.totalSoldQty}
                  </p>
                  <p className="text-xs text-teal-400">Sold Qty</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Orders table / card list ── */}
      <OrdersTable
        onViewOrder={setViewingOrder}
        onUpdateStatus={setUpdatingOrder}
        refreshKey={refreshKey}
        onStatsChange={setStats}
      />

      {/* ── Overlays ── */}
      {showNewOrder && (
        <NewOrderPanel onClose={() => setShowNewOrder(false)} onOrderCreated={handleOrderCreated} />
      )}
      {viewingOrder && (
        <ViewOrderModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      )}
      {updatingOrder && (
        <UpdateStatusModal
          order={updatingOrder}
          onClose={() => setUpdatingOrder(null)}
          onUpdated={handleStatusUpdated}
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease both; }
      `}</style>
    </div>
  );
};

export default OrdersPage;