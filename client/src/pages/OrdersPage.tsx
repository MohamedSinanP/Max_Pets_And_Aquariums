import { useState, useEffect, useCallback, type ReactNode } from "react";
import DataTable, { type Column, type TableAction } from "../components/DataTable";
import {
  getOrders,
  createOrder,
  updateOrderStatus,
  type Order,
  type GetOrdersParams,
  type CreateOrderPayload,
  type OrderStatus,
  type PaymentStatus,
} from "../apis/order";
import { ViewOrderModal, UpdateStatusModal, CreateOrderModal } from "../components/OrderModals";

/* ─── Palette ─── */
const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_LIGHT = "#ccfbf1";
const TEAL_BG = "#f0fdfa";

/* ─── Icons ─── */
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </svg>
);

/* ─── Badge components ─── */
const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#ca8a04" },
  confirmed: { label: "Confirmed", bg: "#dbeafe", color: "#1d4ed8" },
  ready: { label: "Ready", bg: "#f3e8ff", color: "#7c3aed" },
  delivered: { label: "Delivered", bg: "#dcfce7", color: "#16a34a" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#dc2626" },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#ca8a04" },
  paid: { label: "Paid", bg: "#dcfce7", color: "#16a34a" },
  partial: { label: "Partial", bg: "#ffedd5", color: "#ea580c" },
  refunded: { label: "Refunded", bg: "#fee2e2", color: "#dc2626" },
};

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; bg: string; color: string }> }) {
  const c = config[status] ?? { label: status, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

/* ─── Table row shape ─── */
interface OrderRow {
  id: string;
  orderNumber: string;
  customer: string;
  phone: string;
  items: number;
  finalAmount: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  date: string;
  _raw: Order;
}

const toRow = (o: Order): OrderRow => ({
  id: o._id,
  orderNumber: o.orderNumber,
  customer: o.customer?.name ?? "Walk-in",
  phone: o.customer?.phone ?? "—",
  items: o.items.length,
  finalAmount: o.finalAmount,
  orderStatus: o.orderStatus,
  paymentStatus: o.paymentStatus,
  paymentMethod: o.paymentMethod,
  date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  _raw: o,
});

/* ─── Columns ─── */
const columns: Column<OrderRow>[] = [
  {
    key: "orderNumber",
    label: "Order",
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800, color: TEAL_DARK, fontSize: 14, fontFamily: "'DM Mono', monospace" }}>
          {row.orderNumber}
        </div>
        <div style={{ fontSize: 11, color: "#5eaaa0", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
          {row.date}
        </div>
      </div>
    ),
  },
  {
    key: "customer",
    label: "Customer",
    render: (row) => (
      <div>
        <div style={{ fontWeight: 600, color: "#0d4f4a", fontSize: 14 }}>{row.customer}</div>
        <div style={{ fontSize: 12, color: "#5eaaa0" }}>{row.phone}</div>
      </div>
    ),
  },
  {
    key: "items",
    label: "Items",
    align: "center",
    render: (row) => (
      <span style={{ background: TEAL_LIGHT, color: TEAL_DARK, borderRadius: 8, padding: "3px 12px", fontWeight: 700, fontSize: 13 }}>
        {row.items}
      </span>
    ),
  },
  {
    key: "finalAmount",
    label: "Amount",
    align: "right",
    sortable: true,
    render: (row) => (
      <span style={{ fontWeight: 800, color: "#0d4f4a", fontSize: 14 }}>
        ₹{row.finalAmount.toFixed(2)}
      </span>
    ),
  },
  {
    key: "orderStatus",
    label: "Order Status",
    render: (row) => <StatusBadge status={row.orderStatus} config={ORDER_STATUS_CONFIG} />,
  },
  {
    key: "paymentStatus",
    label: "Payment",
    render: (row) => <StatusBadge status={row.paymentStatus} config={PAYMENT_STATUS_CONFIG} />,
  },
  {
    key: "paymentMethod",
    label: "Method",
    render: (row) => (
      <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>
        {row.paymentMethod}
      </span>
    ),
  },
];

/* ─── Filter input style ─── */
const filterInput: React.CSSProperties = {
  padding: "9px 14px",
  border: `1.5px solid ${TEAL_LIGHT}`,
  borderRadius: 10,
  fontSize: 13,
  color: "#0d4f4a",
  background: "#fff",
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
  cursor: "pointer",
};

/* ─── Stub product type for CreateOrderModal ─── */
interface ProductOption {
  _id: string;
  name: string;
  variants: { _id: string; sku: string; sellMode: "packaged" | "loose"; price: { selling: number }; quantity: { unit: string } }[];
}

interface OrdersPageProps {
  /** Pass active products fetched from your products API for the Create Order form */
  products?: ProductOption[];
}

/* ════════════════════════════════════════════
   ORDERS PAGE
════════════════════════════════════════════ */
export default function OrdersPage({ products = [] }: OrdersPageProps) {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  /* Pagination / filter state */
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* Modal state */
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const LIMIT = 8;

  /* ── Fetch ── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetOrdersParams = { page, limit: LIMIT };
      if (search.trim()) params.search = search.trim();
      if (filterOrderStatus) params.orderStatus = filterOrderStatus as OrderStatus;
      if (filterPaymentStatus) params.paymentStatus = filterPaymentStatus as PaymentStatus;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await getOrders(params);
      if (res.success && res.data) {
        setRows(res.data.orders.map(toRow));
        setTotalRecords(res.data.pagination.total);
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterOrderStatus, filterPaymentStatus, filterFrom, filterTo]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Create order ── */
  const handleCreate = async (payload: CreateOrderPayload) => {
    setActionLoading(true);
    try {
      await createOrder(payload);
      showToast("Order placed successfully!");
      setCreateOpen(false);
      setPage(1);
      fetchOrders();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to create order", "error");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Update status ── */
  const handleStatusUpdate = async (orderStatus?: OrderStatus, paymentStatus?: PaymentStatus) => {
    if (!statusOrder) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(statusOrder._id, { orderStatus, paymentStatus });
      showToast("Status updated successfully!");
      setStatusOrder(null);
      fetchOrders();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to update status", "error");
      throw e; // let modal show inline error
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Table actions ── */
  const tableActions: TableAction<OrderRow>[] = [
    {
      label: "View",
      icon: <EyeIcon />,
      onClick: (row) => setViewOrder(row._raw),
      color: "#5eaaa0",
      hoverColor: TEAL,
      hoverBg: TEAL_BG,
    },
    {
      label: "Status",
      icon: <EditIcon />,
      onClick: (row) => setStatusOrder(row._raw),
      color: "#5eaaa0",
      hoverColor: "#1d4ed8",
      hoverBg: "#eff6ff",
    },
  ];

  /* ── Header action ── */
  const headerAction: ReactNode = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        onClick={() => setShowFilters((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 14px",
          border: `1.5px solid ${showFilters ? TEAL : TEAL_LIGHT}`,
          borderRadius: 10,
          background: showFilters ? TEAL_BG : "#fff",
          color: showFilters ? TEAL_DARK : "#5eaaa0",
          cursor: "pointer", fontSize: 13,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
        }}
      >
        <FilterIcon /> Filters
      </button>
      <button
        onClick={fetchOrders}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 14px", border: `1.5px solid ${TEAL_LIGHT}`,
          borderRadius: 10, background: "#fff", color: "#5eaaa0",
          cursor: "pointer", fontSize: 13,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
        }}
      >
        <RefreshIcon />
      </button>
      <button
        onClick={() => setCreateOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", border: "none",
          borderRadius: 10,
          background: `linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`,
          color: "#fff", cursor: "pointer", fontSize: 13,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
          boxShadow: "0 2px 8px rgba(13,148,136,0.25)",
        }}
      >
        <PlusIcon /> New Order
      </button>
    </div>
  );

  /* ── Filter label helper ── */
  const FilterLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL_DARK, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>
      {children}
    </label>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)",
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: toast.type === "success" ? "#f0fdfa" : "#fef2f2",
            border: `1.5px solid ${toast.type === "success" ? TEAL_LIGHT : "#fecaca"}`,
            color: toast.type === "success" ? TEAL_DARK : "#dc2626",
            padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700,
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8, maxWidth: 340,
          }}
        >
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0d4f4a", letterSpacing: "-0.5px" }}>
          Orders
        </h1>
        <p style={{ margin: "4px 0 0", color: "#5eaaa0", fontSize: 14 }}>
          Track and manage all customer orders
        </p>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div
          style={{
            background: "#fff", border: `1.5px solid ${TEAL_LIGHT}`,
            borderRadius: 14, padding: "16px 20px", marginBottom: 16,
            display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end",
          }}
        >
          <div>
            <FilterLabel>Order Status</FilterLabel>
            <select style={filterInput} value={filterOrderStatus}
              onChange={(e) => { setFilterOrderStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {Object.entries(ORDER_STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <FilterLabel>Payment Status</FilterLabel>
            <select style={filterInput} value={filterPaymentStatus}
              onChange={(e) => { setFilterPaymentStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {Object.entries(PAYMENT_STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <FilterLabel>From Date</FilterLabel>
            <input type="date" style={filterInput} value={filterFrom}
              onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <FilterLabel>To Date</FilterLabel>
            <input type="date" style={filterInput} value={filterTo}
              onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} />
          </div>
          <button
            onClick={() => { setFilterOrderStatus(""); setFilterPaymentStatus(""); setFilterFrom(""); setFilterTo(""); setPage(1); }}
            style={{ padding: "9px 14px", border: `1.5px solid ${TEAL_LIGHT}`, borderRadius: 10, background: "#fff", color: "#5eaaa0", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable<OrderRow>
        title="All Orders"
        columns={columns}
        data={rows}
        actions={tableActions}
        loading={loading}
        emptyMessage="No orders found."
        rowsPerPage={LIMIT}
        serverSide
        totalRecords={totalRecords}
        page={page}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search order # or customer…"
        headerAction={headerAction}
        mobileVisibleKeys={["orderNumber", "customer", "finalAmount", "orderStatus", "paymentStatus"]}
      />

      {/* Modals */}
      <ViewOrderModal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder}
      />

      <UpdateStatusModal
        open={!!statusOrder}
        onClose={() => setStatusOrder(null)}
        onSubmit={handleStatusUpdate}
        order={statusOrder}
        loading={actionLoading}
      />

      <CreateOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        products={products}
        loading={actionLoading}
      />
    </div>
  );
}