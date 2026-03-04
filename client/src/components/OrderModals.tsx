/**
 * OrderModals.jsx
 *
 * Standalone modals for Order Management:
 *  1. ViewOrderModal       — Full order detail view
 *  2. UpdateStatusModal    — Update orderStatus + paymentStatus
 *  3. CancelOrderModal     — Cancel confirmation with stock-restore warning
 *  4. PrintReceiptModal    — Receipt preview (print-ready)
 *  5. OrderHistoryModal    — Status change timeline (optional)
 *
 * Usage:
 *   import { ViewOrderModal, UpdateStatusModal, CancelOrderModal, PrintReceiptModal } from "./OrderModals";
 *
 *   <ViewOrderModal order={order} onClose={() => setViewingOrder(null)} />
 *   <UpdateStatusModal order={order} onClose={...} onUpdated={...} />
 *   <CancelOrderModal order={order} onClose={...} onCancelled={...} />
 *   <PrintReceiptModal order={order} onClose={...} />
 */

import { useState, useRef } from "react";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const ORDER_STATUS_CONFIG = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e", dot: "#eab308", icon: "⏳" },
  confirmed: { label: "Confirmed", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6", icon: "✔️" },
  ready: { label: "Ready", bg: "#dcfce7", color: "#166534", dot: "#22c55e", icon: "📦" },
  delivered: { label: "Delivered", bg: "#d1fae5", color: "#065f46", dot: "#10b981", icon: "🚚" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444", icon: "❌" },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Pending", bg: "#fef3c7", color: "#92400e", icon: "⏳" },
  paid: { label: "Paid", bg: "#d1fae5", color: "#065f46", icon: "✅" },
  partial: { label: "Partial", bg: "#e0f2fe", color: "#075985", icon: "💸" },
  refunded: { label: "Refunded", bg: "#fce7f3", color: "#9d174d", icon: "↩️" },
};

/* ─────────────────────────────────────────────────────────────
   SHARED MICRO-COMPONENTS
───────────────────────────────────────────────────────────── */

const Spinner = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="#ccf5f0" strokeWidth="3" />
    <path d="M12 2 A10 10 0 0 1 22 12" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Badge = ({ status, type = "order" }) => {
  const cfg = type === "order" ? ORDER_STATUS_CONFIG[status] : PAYMENT_STATUS_CONFIG[status];
  if (!cfg) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color }}>
      {type === "order" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />}
      {cfg.label}
    </span>
  );
};

const TealBtn = ({ onClick, children, variant = "solid", size = "md", disabled = false, className = "" }) => {
  const base = "inline-flex items-center gap-2 font-bold rounded-xl transition-all duration-200 select-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    solid: disabled ? "bg-teal-200 text-white cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm",
    outline: "border-2 border-teal-500 text-teal-600 hover:bg-teal-50",
    danger: disabled ? "bg-red-200 text-white cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white",
    ghost: "text-teal-600 hover:bg-teal-50",
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </button>
  );
};

const ModalShell = ({ onClose, children, maxWidth = "max-w-lg" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
    <div className="absolute inset-0 bg-teal-950/30 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative bg-white rounded-3xl shadow-2xl shadow-teal-900/20 w-full ${maxWidth} overflow-hidden animate-modal-pop`}>
      {children}
    </div>
    <style>{`
      @keyframes modal-pop {
        from { opacity:0; transform: scale(0.95) translateY(8px); }
        to   { opacity:1; transform: scale(1) translateY(0); }
      }
      .animate-modal-pop { animation: modal-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
      }
    `}</style>
  </div>
);

const ModalHeader = ({ title, subtitle, onClose, color = "from-teal-600 to-teal-700" }) => (
  <div className={`bg-gradient-to-r ${color} px-6 py-4 text-white flex items-center justify-between`}>
    <div>
      <h2 className="font-black text-lg tracking-tight">{title}</h2>
      {subtitle && <p className="text-teal-200 text-xs mt-0.5">{subtitle}</p>}
    </div>
    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors no-print">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
      </svg>
    </button>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   1. VIEW ORDER MODAL
───────────────────────────────────────────────────────────── */

export function ViewOrderModal({ order, onClose, onUpdateStatus, onCancel, onPrint }) {
  const formatDate = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl">
      <ModalHeader
        title={order.orderNumber}
        subtitle={`Created ${formatDate(order.createdAt)}`}
        onClose={onClose}
      />

      <div className="overflow-y-auto max-h-[65vh] p-6 space-y-5">
        {/* Status row */}
        <div className="flex gap-2 flex-wrap items-center">
          <Badge status={order.orderStatus} type="order" />
          <Badge status={order.paymentStatus} type="payment" />
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 capitalize">
            💳 {order.paymentMethod}
          </span>
          <span className="ml-auto text-xs text-teal-400" style={{ fontFamily: "'DM Mono', monospace" }}>
            {order._id}
          </span>
        </div>

        {/* Customer */}
        <Section title="Customer" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        }>
          {order.customer ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Name" value={order.customer.name} />
              <InfoItem label="Phone" value={order.customer.phone} mono />
              {order.customer.email && <InfoItem label="Email" value={order.customer.email} span />}
            </div>
          ) : (
            <p className="text-teal-400 text-sm italic">Walk-in customer (no details recorded)</p>
          )}
        </Section>

        {/* Items */}
        <Section title="Order Items" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        }>
          <div className="space-y-2">
            {order.items.map((item, i) => {
              const productName = typeof item.product === "object" ? item.product.name : "Product";
              const category = typeof item.product === "object" ? item.product.category?.name : null;
              return (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-teal-50/50 border border-teal-50 hover:border-teal-100 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-teal-900 text-sm truncate">{productName}</p>
                    <p className="text-teal-400 text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {category && <span className="mr-2">{category}</span>}
                      ×{item.quantity} {item.unit} · ₹{item.unitPrice}/{item.priceUnit}
                    </p>
                  </div>
                  <span className="font-black text-teal-700 text-sm ml-4 flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                    ₹{item.subtotal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Totals */}
        <Section title="Summary" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
          </svg>
        }>
          <div className="space-y-2">
            <SummaryRow label="Subtotal" value={`₹${order.totalAmount.toFixed(2)}`} />
            {order.discount > 0 && <SummaryRow label="Discount" value={`-₹${order.discount.toFixed(2)}`} className="text-red-500" />}
            <div className="border-t border-teal-100 pt-2 mt-2">
              <SummaryRow label="Final Total" value={`₹${order.finalAmount.toFixed(2)}`} bold />
            </div>
          </div>
        </Section>
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-teal-100 flex items-center gap-2 flex-wrap no-print">
        <TealBtn onClick={onClose} variant="outline" size="sm">Close</TealBtn>
        <div className="ml-auto flex gap-2 flex-wrap">
          {onPrint && (
            <TealBtn onClick={() => onPrint(order)} variant="ghost" size="sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </TealBtn>
          )}
          {onUpdateStatus && order.orderStatus !== "cancelled" && order.orderStatus !== "delivered" && (
            <TealBtn onClick={() => onUpdateStatus(order)} size="sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Update Status
            </TealBtn>
          )}
          {onCancel && order.orderStatus !== "cancelled" && (
            <TealBtn onClick={() => onCancel(order)} variant="danger" size="sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Cancel Order
            </TealBtn>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   2. UPDATE STATUS MODAL
───────────────────────────────────────────────────────────── */

export function UpdateStatusModal({ order, onClose, onUpdated }) {
  const [orderStatus, setOrderStatus] = useState(order.orderStatus);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const willRestoreStock = orderStatus === "cancelled" && order.orderStatus !== "cancelled";
  const willRestoreOnRefund = paymentStatus === "refunded" && order.paymentStatus !== "refunded";

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Replace with: await updateOrderStatus(order._id, { orderStatus, paymentStatus })
      await new Promise(r => setTimeout(r, 900));
      onUpdated?.({ ...order, orderStatus, paymentStatus });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <ModalHeader title="Update Status" subtitle={order.orderNumber} onClose={onClose} />

      <div className="p-6 space-y-5">
        {/* Order Status */}
        <div>
          <label className="block text-xs font-bold text-teal-600 uppercase tracking-wide mb-3">Order Status</label>
          <div className="grid grid-cols-2 gap-2">
            {["pending", "confirmed", "ready", "delivered", "cancelled"].map(s => {
              const cfg = ORDER_STATUS_CONFIG[s];
              const isActive = orderStatus === s;
              return (
                <button key={s} onClick={() => setOrderStatus(s)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${isActive ? "border-teal-600 text-white" : "border-teal-100 text-teal-700 hover:border-teal-300 bg-white"}`}
                  style={isActive ? { background: cfg.dot } : {}}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isActive ? "#fff" : cfg.dot }} />
                  <span className="capitalize">{s}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-xs font-bold text-teal-600 uppercase tracking-wide mb-3">Payment Status</label>
          <div className="grid grid-cols-2 gap-2">
            {["pending", "paid", "partial", "refunded"].map(s => {
              const isActive = paymentStatus === s;
              return (
                <button key={s} onClick={() => setPaymentStatus(s)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all capitalize ${isActive ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-700 hover:border-teal-300 bg-white"}`}>
                  {PAYMENT_STATUS_CONFIG[s]?.icon} {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Warning */}
        {(willRestoreStock || willRestoreOnRefund) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-amber-800 font-bold text-sm">Stock Restoration Warning</p>
              <p className="text-amber-700 text-xs mt-0.5">
                {willRestoreStock ? "Cancelling this order will restore stock for all items." : ""}
                {willRestoreOnRefund ? " Marking as refunded will also restore item quantities." : ""}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-semibold flex gap-2 items-start">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-teal-100 flex items-center justify-between">
        <TealBtn onClick={onClose} variant="outline">Cancel</TealBtn>
        <TealBtn onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner size={14} /> Saving…</> : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg> Save Changes</>
          )}
        </TealBtn>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. CANCEL ORDER MODAL
───────────────────────────────────────────────────────────── */

export function CancelOrderModal({ order, onClose, onCancelled }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const handleCancel = async () => {
    setCancelling(true);
    setError("");
    try {
      // Replace with: await updateOrderStatus(order._id, { orderStatus: "cancelled" })
      await new Promise(r => setTimeout(r, 900));
      onCancelled?.();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <ModalHeader
        title="Cancel Order"
        subtitle={order.orderNumber}
        onClose={onClose}
        color="from-red-500 to-red-600"
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-4 items-start">
          <div className="w-12 h-12 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-teal-900 text-sm">Are you sure you want to cancel this order?</p>
            <p className="text-teal-600 text-sm mt-1">This action will mark the order as <strong>cancelled</strong> and cannot be easily undone.</p>
          </div>
        </div>

        {/* Items to be restored */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-teal-600 uppercase mb-2">Stock to be Restored</p>
          <div className="space-y-1.5">
            {order.items.map((item, i) => {
              const productName = typeof item.product === "object" ? item.product.name : "Product";
              return (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-teal-800 truncate">{productName}</span>
                  <span className="text-teal-600 font-bold ml-4 flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                    +{item.quantity} {item.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-semibold">⚠ {error}</div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-teal-100 flex items-center justify-between">
        <TealBtn onClick={onClose} variant="outline">Keep Order</TealBtn>
        <TealBtn onClick={handleCancel} variant="danger" disabled={cancelling}>
          {cancelling ? <><Spinner size={14} /> Cancelling…</> : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg> Yes, Cancel</>
          )}
        </TealBtn>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   4. PRINT RECEIPT MODAL
───────────────────────────────────────────────────────────── */

export function PrintReceiptModal({ order, onClose, storeName = "PetMart Store" }) {
  const receiptRef = useRef(null);

  const formatDate = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    const printWin = window.open("", "_blank", "width=400,height=700");
    printWin.document.write(`
      <!DOCTYPE html><html><head>
      <title>Receipt - ${order.orderNumber}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; }
        .receipt { max-width: 320px; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #ccc; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .total-row { font-size: 14px; font-weight: bold; }
      </style>
      </head><body>${content}</body></html>
    `);
    printWin.document.close();
    printWin.print();
    printWin.close();
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <ModalHeader title="Receipt Preview" subtitle={order.orderNumber} onClose={onClose} />

      {/* Receipt preview */}
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        <div ref={receiptRef} className="bg-white border-2 border-dashed border-teal-200 rounded-2xl p-5 font-mono text-sm">
          <div className="text-center mb-4">
            <p className="font-black text-teal-900 text-base">{storeName}</p>
            <p className="text-teal-500 text-xs mt-0.5">SALES RECEIPT</p>
            <p className="text-teal-400 text-xs">{formatDate(order.createdAt)}</p>
          </div>

          <div className="border-t-2 border-dashed border-teal-200 pt-3 mb-3">
            <div className="flex justify-between text-xs text-teal-500 mb-2">
              <span>ORDER</span><span style={{ fontFamily: "'DM Mono', monospace" }}>{order.orderNumber}</span>
            </div>
            {order.customer && (
              <div className="text-xs text-teal-600">
                <p><span className="text-teal-400">CUSTOMER: </span>{order.customer.name}</p>
                <p><span className="text-teal-400">PHONE: </span>{order.customer.phone}</p>
              </div>
            )}
          </div>

          <div className="border-t-2 border-dashed border-teal-200 py-3 space-y-2">
            {order.items.map((item, i) => {
              const productName = typeof item.product === "object" ? item.product.name : "Product";
              return (
                <div key={i}>
                  <p className="text-teal-900 font-semibold text-xs truncate">{productName}</p>
                  <div className="flex justify-between text-xs text-teal-600">
                    <span>{item.quantity} {item.unit} × ₹{item.unitPrice}</span>
                    <span className="font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>₹{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t-2 border-dashed border-teal-200 pt-3 space-y-1">
            <div className="flex justify-between text-xs text-teal-600">
              <span>SUBTOTAL</span>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>₹{order.totalAmount.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-xs text-red-500">
                <span>DISCOUNT</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-teal-900 text-sm pt-1 border-t border-teal-100">
              <span>TOTAL</span>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>₹{order.finalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-teal-600 mt-2">
              <span>PAYMENT</span>
              <span className="capitalize">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-teal-600">STATUS</span>
              <span className="font-bold text-teal-700 capitalize">{order.paymentStatus}</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-teal-200 pt-3 mt-2 text-center">
            <p className="text-teal-400 text-xs">Thank you for your purchase!</p>
            <p className="text-teal-300 text-xs mt-0.5">Visit again 🐾</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-teal-100 flex items-center justify-between no-print">
        <TealBtn onClick={onClose} variant="outline">Close</TealBtn>
        <TealBtn onClick={handlePrint}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Receipt
        </TealBtn>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   HELPER COMPONENTS (internal)
───────────────────────────────────────────────────────────── */

function Section({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-teal-500">{icon}</span>
        <h4 className="font-bold text-teal-700 text-sm uppercase tracking-wide">{title}</h4>
      </div>
      <div className="bg-teal-50/40 rounded-2xl border border-teal-100 p-4">
        {children}
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono = false, span = false }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-xs text-teal-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-teal-900 font-semibold text-sm" style={mono ? { fontFamily: "'DM Mono', monospace" } : {}}>{value || "—"}</p>
    </div>
  );
}

function SummaryRow({ label, value, bold = false, className = "" }) {
  return (
    <div className={`flex justify-between text-sm ${className}`}>
      <span className={bold ? "font-black text-teal-900 text-base" : "text-teal-600"}>{label}</span>
      <span className={bold ? "font-black text-teal-900 text-base" : "font-semibold text-teal-800"}
        style={{ fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DEMO COMPONENT
   Remove this in production — it's just for visual testing
───────────────────────────────────────────────────────────── */

const DEMO_ORDER = {
  _id: "ord_demo_001",
  id: "ord_demo_001",
  orderNumber: "ORD-20260305-0001",
  customer: { name: "Arjun Nair", phone: "+91 9876543210", email: "arjun@example.com" },
  items: [
    { _id: "i1", product: { _id: "p1", name: "Royal Canin Adult 4kg", category: { name: "Dog Food" } }, variant: "v1", quantity: 2, unit: "pcs", sellMode: "packaged", priceUnit: "pcs", unitPrice: 1850, subtotal: 3700 },
    { _id: "i2", product: { _id: "p2", name: "Pedigree Puppy 3kg", category: { name: "Dog Food" } }, variant: "v2", quantity: 1, unit: "pcs", sellMode: "packaged", priceUnit: "pcs", unitPrice: 780, subtotal: 780 },
  ],
  totalAmount: 4480,
  discount: 200,
  finalAmount: 4280,
  paymentStatus: "pending",
  paymentMethod: "cash",
  orderStatus: "confirmed",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function OrderModalsDemo() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-teal-50/20 p-8"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-teal-900 tracking-tight">Order Modals</h1>
          <p className="text-teal-500 mt-1 text-sm">Click any button to preview the modal</p>
        </div>

        <div className="bg-white rounded-3xl border-2 border-teal-100 p-8 shadow-sm">
          <h2 className="font-bold text-teal-700 text-sm uppercase tracking-wide mb-6">Demo Order: {DEMO_ORDER.orderNumber}</h2>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "view", label: "View Order Details", icon: "👁️", variant: "solid" },
              { id: "status", label: "Update Status", icon: "✏️", variant: "outline" },
              { id: "cancel", label: "Cancel Order", icon: "❌", variant: "danger" },
              { id: "print", label: "Print Receipt", icon: "🖨️", variant: "outline" },
            ].map(btn => (
              <TealBtn key={btn.id} onClick={() => setActiveModal(btn.id)} variant={btn.variant} size="md" className="justify-center">
                <span>{btn.icon}</span>
                {btn.label}
              </TealBtn>
            ))}
          </div>

          {/* Order snapshot */}
          <div className="mt-8 p-5 bg-teal-50/50 rounded-2xl border border-teal-100 text-sm space-y-2">
            <p className="font-bold text-teal-700">Demo Order Snapshot</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-teal-500">Customer</span><span className="font-semibold text-teal-900">{DEMO_ORDER.customer.name}</span>
              <span className="text-teal-500">Items</span><span className="font-semibold text-teal-900">{DEMO_ORDER.items.length} items</span>
              <span className="text-teal-500">Total</span><span className="font-semibold text-teal-900" style={{ fontFamily: "'DM Mono', monospace" }}>₹{DEMO_ORDER.finalAmount.toFixed(2)}</span>
              <span className="text-teal-500">Status</span><span><Badge status={DEMO_ORDER.orderStatus} type="order" /></span>
              <span className="text-teal-500">Payment</span><span><Badge status={DEMO_ORDER.paymentStatus} type="payment" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Render active modal */}
      {activeModal === "view" && (
        <ViewOrderModal
          order={DEMO_ORDER}
          onClose={() => setActiveModal(null)}
          onUpdateStatus={() => setActiveModal("status")}
          onCancel={() => setActiveModal("cancel")}
          onPrint={() => setActiveModal("print")}
        />
      )}
      {activeModal === "status" && (
        <UpdateStatusModal
          order={DEMO_ORDER}
          onClose={() => setActiveModal(null)}
          onUpdated={() => setActiveModal(null)}
        />
      )}
      {activeModal === "cancel" && (
        <CancelOrderModal
          order={DEMO_ORDER}
          onClose={() => setActiveModal(null)}
          onCancelled={() => setActiveModal(null)}
        />
      )}
      {activeModal === "print" && (
        <PrintReceiptModal
          order={DEMO_ORDER}
          onClose={() => setActiveModal(null)}
          storeName="PetMart Store"
        />
      )}
    </div>
  );
}