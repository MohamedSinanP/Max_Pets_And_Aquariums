import type { CartItem } from "../../types/order";

interface CartItemRowProps {
  item: CartItem;
  onUpdate: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
}

/* ─────────────────────────────────────────────────────────────
   HELPERS — loose quantity display
   The backend stores loose quantities in grams (g).
   We show:  "500 g"          when < 1000 g
             "1000 g (1 kg)"  when exactly on a kg boundary
             "1500 g (1.5 kg)" otherwise
───────────────────────────────────────────────────────────── */
function formatLooseQty(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  const kg = grams / 1000;
  // show up to 3 decimal places, trim trailing zeros
  const kgStr = parseFloat(kg.toFixed(3)).toString();
  return `${grams} g  (${kgStr} kg)`;
}

/** Label shown next to the stepper buttons */
function LooseQtyLabel({ grams }: { grams: number }) {
  const kg = grams / 1000;
  const kgStr = parseFloat(kg.toFixed(3)).toString();

  return (
    <span
      className="text-xs font-bold whitespace-nowrap"
      style={{ fontFamily: "'DM Mono', monospace", color: "#0f766e" }}
    >
      {grams} g
      {grams >= 1000 && (
        <span style={{ color: "#5eaaa0", fontWeight: 500 }}> ({kgStr} kg)</span>
      )}
    </span>
  );
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, onUpdate, onRemove }) => {
  const isLoose = item.sellMode === "loose";

  /*
   * Loose step = 100 g  (smallest sensible increment for pet-store loose goods)
   * Packed step = 1 unit
   */
  const step = isLoose ? 100 : 1;
  const min = isLoose ? 100 : 1;

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-teal-50 hover:border-teal-100 bg-white hover:bg-teal-50/30 transition-all">

      {/* ── Product info ── */}
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

        {/* Loose quantity helper shown below the product name */}
        {isLoose && (
          <p className="mt-1.5">
            <LooseQtyLabel grams={item.quantity} />
          </p>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Stepper */}
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
              min={min}
              max={item.variantStock}
              step={step}
              value={item.quantity}
              onChange={e =>
                onUpdate(
                  item.key,
                  Math.max(min, Math.min(item.variantStock, Number(e.target.value)))
                )
              }
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

          {/*
           * Unit hint under the stepper:
           *   Loose  → "step: 100 g"
           *   Packed → "pcs / unit / etc."
           */}
          <span
            className="text-[10px] text-teal-400 font-semibold tracking-wide"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {isLoose ? "step: 100 g" : item.priceUnit}
          </span>
        </div>

        {/* Subtotal */}
        <p
          className="text-teal-700 font-black text-sm w-20 text-right"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          ₹{item.subtotal.toFixed(2)}
        </p>

        {/* Remove */}
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