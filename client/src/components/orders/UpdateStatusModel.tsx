
import { useState } from "react";
import type { Order, OrderStatus, PaymentStatus } from "../../types/order";
import { ORDER_STATUS_CONFIG, Spinner, TealBtn } from "./OrderUi";
import { updateOrderStatus } from "../../apis/order";

export interface UpdateStatusModalProps {
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}

export function UpdateStatusModal({ order, onClose, onUpdated }: UpdateStatusModalProps) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(order.orderStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateOrderStatus(order._id, { orderStatus, paymentStatus });
      onUpdated();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Failed to update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-teal-950/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-teal-900/20 w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg">Update Status</h2>
            <p className="text-teal-200 text-xs mt-0.5">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-teal-800/50 rounded-xl transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-teal-600 uppercase mb-2">Order Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(["pending", "confirmed", "ready", "delivered", "cancelled"] as OrderStatus[]).map(s => (
                <button key={s} onClick={() => setOrderStatus(s)}
                  className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all capitalize flex items-center gap-2 ${orderStatus === s ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-600 hover:border-teal-300"}`}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ORDER_STATUS_CONFIG[s]?.dot }} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-teal-600 uppercase mb-2">Payment Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(["pending", "paid", "partial", "refunded"] as PaymentStatus[]).map(s => (
                <button key={s} onClick={() => setPaymentStatus(s)}
                  className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all capitalize ${paymentStatus === s ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-600 hover:border-teal-300"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {(orderStatus === "cancelled" || paymentStatus === "refunded") && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs font-semibold flex gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Stock will be restored for {orderStatus === "cancelled" ? "cancelled order" : "refunded items"}.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-semibold">
              ⚠ {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-teal-100 flex items-center justify-between">
          <TealBtn onClick={onClose} variant="outline">Cancel</TealBtn>
          <TealBtn onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner size={14} /> Saving…</> : "Save Changes"}
          </TealBtn>
        </div>
      </div>
    </div>
  );
}