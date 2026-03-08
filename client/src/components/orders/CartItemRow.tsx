import type { CartItem } from "../../types/order";
import {
  storedToDisplayQty,
  displayToStoredQty,
  getDisplayUnit,
  formatQuantityForUser,
} from "../../utils/productUnits";

interface CartItemRowProps {
  item: CartItem;
  onUpdate: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, onUpdate, onRemove }) => {
  const isLoose = item.sellMode === "loose";

  const step = isLoose
    ? item.unit === "mg"
      ? 1000
      : 1
    : 1;

  const min = isLoose
    ? item.unit === "mg"
      ? 1000
      : 1
    : 1;

  const displayValue = isLoose ? storedToDisplayQty(item.quantity, item.unit) : item.quantity;
  const displayMin = isLoose ? storedToDisplayQty(min, item.unit) : min;
  const displayMax = isLoose ? storedToDisplayQty(item.variantStock, item.unit) : item.variantStock;

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-teal-50 hover:border-teal-100 bg-white hover:bg-teal-50/30 transition-all">
      <div className="flex-1 min-w-0">
        <p
          className="font-bold text-teal-900 text-sm truncate"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {item.productName}
        </p>

        <p className="text-teal-500 text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
          {item.variantLabel} · ₹{item.unitPrice}/{item.priceUnit}
        </p>

        {isLoose && (
          <p className="mt-1.5">
            <span
              className="text-xs font-bold whitespace-nowrap"
              style={{ fontFamily: "'DM Mono', monospace", color: "#0f766e" }}
            >
              {formatQuantityForUser(item.quantity, item.unit)}
            </span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center border-2 border-teal-100 rounded-xl overflow-hidden">
            <button
              onClick={() => onUpdate(item.key, Math.max(min, item.quantity - step))}
              className="px-2.5 py-1.5 text-teal-500 hover:bg-teal-50 text-sm font-bold transition-colors"
            >
              −
            </button>

            <input
              type="number"
              min={displayMin}
              max={displayMax}
              step={1}
              value={displayValue}
              onChange={e => {
                const raw = Number(e.target.value);

                if (isLoose) {
                  const enteredDisplayQty = isNaN(raw) ? 0 : raw;
                  const storedQty = displayToStoredQty(enteredDisplayQty, item.unit);

                  onUpdate(
                    item.key,
                    Math.max(min, Math.min(item.variantStock, storedQty))
                  );
                } else {
                  onUpdate(
                    item.key,
                    Math.max(min, Math.min(item.variantStock, raw))
                  );
                }
              }}
              className="w-16 text-center text-sm font-bold text-teal-800 border-x-2 border-teal-100 py-1.5 focus:outline-none focus:bg-teal-50"
              style={{ fontFamily: "'DM Mono', monospace" }}
            />

            <button
              onClick={() => onUpdate(item.key, Math.min(item.variantStock, item.quantity + step))}
              className="px-2.5 py-1.5 text-teal-500 hover:bg-teal-50 text-sm font-bold transition-colors"
            >
              +
            </button>
          </div>

          <span
            className="text-[10px] text-teal-400 font-semibold tracking-wide"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {isLoose ? `step: 1 ${getDisplayUnit(item.unit)}` : item.priceUnit}
          </span>
        </div>

        <p
          className="text-teal-700 font-black text-sm w-20 text-right"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          ₹{item.subtotal.toFixed(2)}
        </p>

        <button
          onClick={() => onRemove(item.key)}
          className="text-red-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};