import { useState, useEffect } from "react";
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  CreateOrderPayload,
  CreateOrderItemPayload,
  ItemUnit,
  SellMode,
} from "../apis/order";

/* ─── Palette ─── */
const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_LIGHT = "#ccfbf1";
const TEAL_BG = "#f0fdfa";

/* ─── Shared style helpers ─── */
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(4px)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalBase: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  boxShadow: "0 24px 64px rgba(15,118,110,0.18), 0 4px 16px rgba(0,0,0,0.1)",
  width: "100%",
  maxWidth: 600,
  maxHeight: "92vh",
  overflowY: "auto",
  fontFamily: "'DM Sans', sans-serif",
};

const modalHeader: React.CSSProperties = {
  background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`,
  padding: "20px 24px",
  borderRadius: "20px 20px 0 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: `1.5px solid ${TEAL_LIGHT}`,
  borderRadius: 10,
  fontSize: 14,
  color: "#0d4f4a",
  background: TEAL_BG,
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  color: TEAL_DARK,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: TEAL_DARK,
  padding: "10px 0 8px",
  borderBottom: `2px solid ${TEAL_LIGHT}`,
  marginBottom: 14,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: TEAL,
  border: `1.5px solid ${TEAL_LIGHT}`,
  borderRadius: 10,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

/* ─── Status config ─── */
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

function StatusPill({ status, config }: { status: string; config: Record<string, { label: string; bg: string; color: string }> }) {
  const c = config[status] ?? { label: status, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 8, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.15)",
        border: "none",
        borderRadius: 8,
        color: "#fff",
        width: 32,
        height: 32,
        cursor: "pointer",
        fontSize: 18,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      ×
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ════════════════════════════════════════════
   VIEW ORDER MODAL
════════════════════════════════════════════ */

interface ViewOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}

export function ViewOrderModal({ open, onClose, order }: ViewOrderModalProps) {
  if (!open || !order) return null;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 0",
        borderBottom: `1px solid ${TEAL_LIGHT}`,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "#5eaaa0", textTransform: "uppercase", letterSpacing: "0.4px", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "#0d4f4a", textAlign: "right" }}>{value}</span>
    </div>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalBase, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 17, fontWeight: 800 }}>
              {order.orderNumber}
            </h2>
            <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        <div style={{ padding: 24 }}>
          {/* Status row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <StatusPill status={order.orderStatus} config={ORDER_STATUS_CONFIG} />
            <StatusPill status={order.paymentStatus} config={PAYMENT_STATUS_CONFIG} />
            <span style={{ background: TEAL_LIGHT, color: TEAL_DARK, borderRadius: 8, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              {order.paymentMethod.toUpperCase()}
            </span>
          </div>

          {/* Customer */}
          {order.customer && (
            <>
              <div style={sectionTitle}>Customer</div>
              <InfoRow label="Name" value={order.customer.name} />
              <InfoRow label="Phone" value={order.customer.phone} />
              {order.customer.email && <InfoRow label="Email" value={order.customer.email} />}
            </>
          )}

          {/* Items */}
          <div style={{ ...sectionTitle, marginTop: 16 }}>
            Items ({order.items.length})
          </div>
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {order.items.map((item, i) => {
              const productName =
                typeof item.product === "object" ? item.product.name : `Product #${i + 1}`;
              return (
                <div
                  key={item._id ?? i}
                  style={{
                    border: `1.5px solid ${TEAL_LIGHT}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: TEAL_BG,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 700, color: "#0d4f4a", fontSize: 14 }}>{productName}</div>
                    <div style={{ color: "#5eaaa0", fontSize: 12, marginTop: 3 }}>
                      {item.quantity} {item.unit} · {item.sellMode}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: "#0d4f4a", fontSize: 14 }}>
                      ₹{item.subtotal.toFixed(2)}
                    </div>
                    <div style={{ color: "#5eaaa0", fontSize: 12 }}>
                      ₹{item.unitPrice} / {item.unit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div style={{ ...sectionTitle }}>Summary</div>
          <InfoRow label="Total" value={`₹${order.totalAmount.toFixed(2)}`} />
          {order.discount > 0 && (
            <InfoRow label="Discount" value={<span style={{ color: "#16a34a", fontWeight: 700 }}>- ₹{order.discount.toFixed(2)}</span>} />
          )}
          <InfoRow
            label="Final Amount"
            value={<span style={{ fontWeight: 800, fontSize: 16, color: TEAL_DARK }}>₹{order.finalAmount.toFixed(2)}</span>}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={onClose} style={btnPrimary}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   UPDATE STATUS MODAL
════════════════════════════════════════════ */

interface UpdateStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (orderStatus?: OrderStatus, paymentStatus?: PaymentStatus) => Promise<void>;
  order: Order | null;
  loading?: boolean;
}

export function UpdateStatusModal({
  open,
  onClose,
  onSubmit,
  order,
  loading = false,
}: UpdateStatusModalProps) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [error, setError] = useState("");

  useEffect(() => {
    if (order) {
      setOrderStatus(order.orderStatus);
      setPaymentStatus(order.paymentStatus);
    }
    setError("");
  }, [order, open]);

  if (!open || !order) return null;

  const handleSubmit = async () => {
    setError("");
    try {
      await onSubmit(orderStatus, paymentStatus);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Update failed");
    }
  };

  const isCancellingWithPaid =
    orderStatus === "cancelled" && order.paymentStatus === "paid";

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalBase, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 17, fontWeight: 800 }}>
              Update Status
            </h2>
            <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              {order.orderNumber}
            </p>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        <div style={{ padding: 24 }}>
          {/* Current status */}
          <div
            style={{
              background: TEAL_BG,
              border: `1.5px solid ${TEAL_LIGHT}`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5eaaa0" }}>Current:</span>
            <StatusPill status={order.orderStatus} config={ORDER_STATUS_CONFIG} />
            <StatusPill status={order.paymentStatus} config={PAYMENT_STATUS_CONFIG} />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          {isCancellingWithPaid && (
            <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "10px 14px", color: "#ea580c", fontSize: 13, marginBottom: 16 }}>
              ⚠ Cancelling a paid order will restore stock. Consider setting payment to "Refunded".
            </div>
          )}

          <FormField label="Order Status">
            <SelectField
              value={orderStatus}
              onChange={(v) => setOrderStatus(v as OrderStatus)}
              options={Object.entries(ORDER_STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
            />
          </FormField>

          <FormField label="Payment Status">
            <SelectField
              value={paymentStatus}
              onChange={(v) => setPaymentStatus(v as PaymentStatus)}
              options={Object.entries(PAYMENT_STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
            />
          </FormField>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Updating…" : "Update Status"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CREATE ORDER MODAL
════════════════════════════════════════════ */

interface ProductOption {
  _id: string;
  name: string;
  variants: {
    _id: string;
    sku: string;
    sellMode: SellMode;
    price: { selling: number };
    quantity: { unit: string };
  }[];
}

interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateOrderPayload) => Promise<void>;
  products: ProductOption[];
  loading?: boolean;
}

interface LineItem {
  product: string;
  variant: string;
  quantity: number;
  unit: ItemUnit;
  sellMode: SellMode;
}

const emptyLine = (): LineItem => ({
  product: "",
  variant: "",
  quantity: 1,
  unit: "pcs",
  sellMode: "packaged",
});

export function CreateOrderModal({
  open,
  onClose,
  onSubmit,
  products,
  loading = false,
}: CreateOrderModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setPaymentMethod("cash");
    setDiscount(0);
    setLines([emptyLine()]);
    setError("");
  }, [open]);

  if (!open) return null;

  const getVariants = (productId: string) =>
    products.find((p) => p._id === productId)?.variants ?? [];

  const updateLine = (i: number, patch: Partial<LineItem>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const handleProductChange = (i: number, productId: string) => {
    const variants = getVariants(productId);
    const firstVariant = variants[0];
    updateLine(i, {
      product: productId,
      variant: firstVariant?._id ?? "",
      sellMode: firstVariant?.sellMode ?? "packaged",
      unit: (firstVariant?.sellMode === "loose" ? "g" : "pcs") as ItemUnit,
    });
  };

  const handleVariantChange = (i: number, variantId: string) => {
    const line = lines[i];
    const v = getVariants(line.product).find((v) => v._id === variantId);
    updateLine(i, {
      variant: variantId,
      sellMode: v?.sellMode ?? "packaged",
      unit: (v?.sellMode === "loose" ? "g" : "pcs") as ItemUnit,
    });
  };

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError("");
    if (lines.some((l) => !l.product || !l.variant))
      return setError("All items must have a product and variant selected.");
    if (lines.some((l) => l.quantity <= 0))
      return setError("Quantity must be greater than 0.");

    const payload: CreateOrderPayload = {
      customer:
        customerName.trim() || customerPhone.trim()
          ? {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim() || null,
          }
          : null,
      paymentMethod,
      discount: discount || 0,
      items: lines.map((l) => ({
        product: l.product,
        variant: l.variant,
        quantity: l.quantity,
        unit: l.unit,
        sellMode: l.sellMode,
      })),
    };

    await onSubmit(payload);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalBase, maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 17, fontWeight: 800 }}>New Order</h2>
            <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              Add items and fill in customer details
            </p>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          {/* Customer */}
          <div style={sectionTitle}>Customer (Optional)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Name">
              <input style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in customer" />
            </FormField>
            <FormField label="Phone">
              <input style={inputStyle} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91 9999999999" />
            </FormField>
          </div>
          <FormField label="Email">
            <input style={inputStyle} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="optional@gmail.com" type="email" />
          </FormField>

          {/* Items */}
          <div style={{ ...sectionTitle, marginTop: 4 }}>Order Items</div>
          {lines.map((line, i) => {
            const variants = getVariants(line.product);
            return (
              <div
                key={i}
                style={{
                  border: `1.5px solid ${TEAL_LIGHT}`,
                  borderRadius: 12,
                  padding: "14px",
                  marginBottom: 12,
                  background: TEAL_BG,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: TEAL_DARK }}>Item {i + 1}</span>
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(i)}
                      style={{ background: "#fff", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <FormField label="Product *">
                    <SelectField
                      value={line.product}
                      onChange={(v) => handleProductChange(i, v)}
                      options={[
                        { label: "Select product…", value: "" },
                        ...products.map((p) => ({ label: p.name, value: p._id })),
                      ]}
                    />
                  </FormField>
                  <FormField label="Variant *">
                    <SelectField
                      value={line.variant}
                      onChange={(v) => handleVariantChange(i, v)}
                      options={
                        variants.length
                          ? variants.map((v) => ({ label: `${v.sku} — ₹${v.price.selling}`, value: v._id }))
                          : [{ label: "Select product first", value: "" }]
                      }
                    />
                  </FormField>
                  <FormField label="Quantity *">
                    <input
                      style={inputStyle}
                      type="number"
                      min={0.001}
                      step={line.sellMode === "loose" ? 0.5 : 1}
                      value={line.quantity}
                      onChange={(e) => updateLine(i, { quantity: +e.target.value })}
                    />
                  </FormField>
                  <FormField label="Unit">
                    <SelectField
                      value={line.unit}
                      onChange={(v) => updateLine(i, { unit: v as ItemUnit })}
                      options={
                        line.sellMode === "loose"
                          ? [{ label: "g (grams)", value: "g" }, { label: "ml", value: "ml" }]
                          : [{ label: "pcs", value: "pcs" }]
                      }
                    />
                  </FormField>
                </div>
              </div>
            );
          })}
          <button onClick={addLine} style={{ ...btnSecondary, marginBottom: 20, fontSize: 13 }}>
            + Add Item
          </button>

          {/* Payment */}
          <div style={sectionTitle}>Payment</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Payment Method">
              <SelectField
                value={paymentMethod}
                onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                options={[
                  { label: "Cash", value: "cash" },
                  { label: "Card", value: "card" },
                  { label: "Online", value: "online" },
                  { label: "Other", value: "other" },
                ]}
              />
            </FormField>
            <FormField label="Discount (₹)">
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(+e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Placing…" : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}