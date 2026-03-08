import type { Order, OrderItem } from "../../types/order";
import { Badge, TealBtn } from "./OrderUi";

export interface ViewOrderModalProps { order: Order; onClose: () => void; }
export function ViewOrderModal({ order, onClose }: ViewOrderModalProps) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const getProductName = (product: OrderItem["product"]): string =>
    typeof product === "object" ? product.name : "Product";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-teal-950/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-teal-900/20 w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg">{order.orderNumber}</h2>
            <p className="text-teal-200 text-xs mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-teal-800/50 rounded-xl transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-2 flex-wrap">
            <Badge status={order.orderStatus} type="order" />
            <Badge status={order.paymentStatus} type="payment" />
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 capitalize">
              {order.paymentMethod}
            </span>
          </div>

          {order.customer && (
            <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100">
              <p className="text-xs font-bold text-teal-500 uppercase mb-2">Customer</p>
              <p className="font-bold text-teal-900">{order.customer.name}</p>
              <p className="text-sm text-teal-600">{order.customer.phone}</p>
              {order.customer.email && <p className="text-sm text-teal-500">{order.customer.email}</p>}
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-teal-500 uppercase mb-2">Items</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-teal-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-teal-900">{getProductName(item.product)}</p>
                    <p className="text-xs text-teal-400">Qty: {item.quantity} {item.unit}</p>
                  </div>
                  <span className="font-bold text-teal-700 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                    ₹{item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
            <div className="flex justify-between text-sm text-teal-700 mb-1">
              <span>Subtotal</span>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>₹{order.totalAmount.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-red-500 mb-1">
                <span>Discount</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-teal-900 text-base border-t border-teal-200 pt-2 mt-1">
              <span>Final Total</span>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>₹{order.finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-teal-100 flex justify-end">
          <TealBtn onClick={onClose} variant="outline">Close</TealBtn>
        </div>
      </div>
    </div>
  );
}
