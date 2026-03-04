/**
 * OrdersPage.jsx
 *
 * Full Order Management Page
 * - Lists all orders with search, filter, pagination
 * - "New Order" button → slide-in cart flow:
 *     Step 1: Browse products (search, filter, pagination) → add to cart
 *     Step 2: Cart preview (set qty, variant, customer, discount, payment)
 *     Step 3: Confirm & create
 *
 * Uses: teal + white color scheme, DM Sans + DM Mono fonts, Tailwind CSS
 *
 * Props / wiring:
 *   All API calls use the service functions from orders.api.ts and product.api.ts
 *   Replace the mock data / API calls with actual imports as needed.
 */

import { useState, useEffect, useCallback, useRef } from "react";

/* ─────────────────────────────────────────────────────────────
   MOCK DATA (replace with real API calls)
───────────────────────────────────────────────────────────── */

const MOCK_PRODUCTS = Array.from({ length: 24 }, (_, i) => ({
  _id: `prod_${i + 1}`,
  name: ["Royal Canin Adult", "Pedigree Puppy", "Whiskas Tuna", "Drools Focus", "Me-O Chicken", "Farmina N&D", "Acana Heritage", "Orijen Cat", "Hill's Science", "Blue Buffalo"][i % 10] + ` ${i + 1}`,
  category: { _id: `cat_${(i % 4) + 1}`, name: ["Dog Food", "Cat Food", "Bird Food", "Accessories"][i % 4] },
  type: ["food", "food", "food", "accessory"][i % 4],
  isActive: i % 7 !== 6,
  variants: [
    {
      _id: `var_${i * 2 + 1}`,
      sku: `SKU-${1000 + i * 2}`,
      sellMode: "packaged",
      attributes: { Size: "1 kg", Color: "" },
      price: { buying: 300 + i * 10, selling: 450 + i * 15 },
      priceUnit: "pcs",
      quantity: { inStock: 50 - i, baseUnit: "pcs" },
      isActive: true,
    },
    {
      _id: `var_${i * 2 + 2}`,
      sku: `SKU-${1000 + i * 2 + 1}`,
      sellMode: "packaged",
      attributes: { Size: "5 kg", Color: "" },
      price: { buying: 1200 + i * 40, selling: 1800 + i * 55 },
      priceUnit: "pcs",
      quantity: { inStock: 20 - (i % 15), baseUnit: "pcs" },
      isActive: true,
    },
  ],
  images: [],
}));

const MOCK_ORDERS = Array.from({ length: 18 }, (_, i) => ({
  _id: `ord_${i + 1}`,
  id: `ord_${i + 1}`,
  orderNumber: `ORD-20260305-${String(i + 1).padStart(4, "0")}`,
  customer: i % 5 === 0 ? null : { name: ["Arjun Nair", "Priya Menon", "Rahul Sharma", "Sneha Pillai", "Ajay Kumar"][i % 5], phone: `+91 98${String(i).padStart(8, "0")}`, email: null },
  items: [
    {
      _id: `item_${i}`,
      product: { _id: `prod_${(i % 10) + 1}`, name: MOCK_PRODUCTS[i % 10].name, category: MOCK_PRODUCTS[i % 10].category },
      variant: `var_${i + 1}`,
      quantity: (i % 3) + 1,
      unit: "pcs",
      sellMode: "packaged",
      priceUnit: "pcs",
      unitPrice: 450 + i * 15,
      subtotal: (450 + i * 15) * ((i % 3) + 1),
    },
  ],
  totalAmount: (450 + i * 15) * ((i % 3) + 1),
  discount: i % 4 === 0 ? 50 : 0,
  finalAmount: (450 + i * 15) * ((i % 3) + 1) - (i % 4 === 0 ? 50 : 0),
  paymentStatus: ["pending", "paid", "partial", "refunded"][i % 4],
  paymentMethod: ["cash", "card", "online", "other"][i % 4],
  orderStatus: ["pending", "confirmed", "ready", "delivered", "cancelled"][i % 5],
  createdAt: new Date(Date.now() - i * 3600000 * 8).toISOString(),
  updatedAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
}));

const CATEGORIES = [
  { _id: "", name: "All Categories" },
  { _id: "cat_1", name: "Dog Food" },
  { _id: "cat_2", name: "Cat Food" },
  { _id: "cat_3", name: "Bird Food" },
  { _id: "cat_4", name: "Accessories" },
];

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const ORDER_STATUS_CONFIG = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  confirmed: { label: "Confirmed", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  ready: { label: "Ready", bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  delivered: { label: "Delivered", bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Pending", bg: "#fef3c7", color: "#92400e" },
  paid: { label: "Paid", bg: "#d1fae5", color: "#065f46" },
  partial: { label: "Partial", bg: "#e0f2fe", color: "#075985" },
  refunded: { label: "Refunded", bg: "#fce7f3", color: "#9d174d" },
};

/* ─────────────────────────────────────────────────────────────
   SMALL UI COMPONENTS
───────────────────────────────────────────────────────────── */

const Badge = ({ status, type = "order" }) => {
  const cfg = type === "order" ? ORDER_STATUS_CONFIG[status] : PAYMENT_STATUS_CONFIG[status];
  if (!cfg) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {type === "order" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />}
      {cfg.label}
    </span>
  );
};

const Spinner = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="#ccf5f0" strokeWidth="3" />
    <path d="M12 2 A10 10 0 0 1 22 12" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const EmptyState = ({ message = "No data found." }) => (
  <div className="flex flex-col items-center justify-center py-20 text-teal-400">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 opacity-40">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 9h6M9 12h4" strokeLinecap="round" />
    </svg>
    <p className="font-semibold text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{message}</p>
  </div>
);

const TealBtn = ({ onClick, children, variant = "solid", size = "md", disabled = false, className = "" }) => {
  const base = "inline-flex items-center gap-2 font-bold rounded-xl transition-all duration-200 cursor-pointer select-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    solid: disabled
      ? "bg-teal-200 text-white cursor-not-allowed"
      : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md",
    outline: disabled
      ? "border-2 border-teal-200 text-teal-300 cursor-not-allowed"
      : "border-2 border-teal-500 text-teal-600 hover:bg-teal-50",
    ghost: "text-teal-600 hover:bg-teal-50",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────
   SEARCH + FILTER BAR
───────────────────────────────────────────────────────────── */

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 pr-4 py-2.5 border-2 border-teal-100 rounded-xl text-sm bg-white focus:outline-none focus:border-teal-400 text-teal-900 placeholder-teal-300 w-64 transition-colors"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    />
  </div>
);

const Select = ({ value, onChange, options, className = "" }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`px-3 py-2.5 border-2 border-teal-100 rounded-xl text-sm bg-white focus:outline-none focus:border-teal-400 text-teal-800 transition-colors ${className}`}
    style={{ fontFamily: "'DM Sans', sans-serif" }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

/* ─────────────────────────────────────────────────────────────
   PAGINATION
───────────────────────────────────────────────────────────── */

const Pagination = ({ page, totalPages, total, limit, onChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-teal-50 bg-gradient-to-r from-teal-50/60 to-white">
      <span className="text-sm text-teal-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border-2 border-teal-100 text-teal-600 text-sm font-bold disabled:opacity-30 hover:border-teal-400 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>← Prev</button>
        {pages.reduce((acc, p, idx, arr) => {
          if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
          acc.push(p);
          return acc;
        }, []).map((p, i) =>
          p === "..." ? <span key={i} className="px-2 text-teal-400 text-sm">…</span> :
            <button key={i} onClick={() => onChange(p)}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-colors ${page === p ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-600 hover:border-teal-400"}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}>{p}</button>
        )}
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border-2 border-teal-100 text-teal-600 text-sm font-bold disabled:opacity-30 hover:border-teal-400 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>Next →</button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   PRODUCT CARD (for new order selection)
───────────────────────────────────────────────────────────── */

const ProductCard = ({ product, onAddToCart, cartItems }) => {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const activeVariants = product.variants.filter(v => v.isActive);
  const variant = activeVariants[selectedVariantIdx] || activeVariants[0];
  if (!variant) return null;

  const inCart = cartItems.find(c => c.productId === product._id && c.variantId === variant._id);
  const outOfStock = variant.quantity.inStock <= 0;

  const attrLabel = Object.entries(variant.attributes || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ") || "Default";

  return (
    <div className="bg-white rounded-2xl border-2 border-teal-50 hover:border-teal-200 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-teal-50 group">
      {/* Image placeholder */}
      <div className="h-28 bg-gradient-to-br from-teal-50 to-teal-100/50 flex items-center justify-center relative">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#99d6d0" strokeWidth="1.2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" strokeLinecap="round" />
        </svg>
        {outOfStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-red-400 text-xs font-bold px-2 py-1 bg-red-50 rounded-lg border border-red-100">Out of Stock</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            {product.category?.name || product.type}
          </span>
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-bold text-teal-900 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {product.name}
        </h4>

        {/* Variant selector */}
        {activeVariants.length > 1 && (
          <select
            value={selectedVariantIdx}
            onChange={e => setSelectedVariantIdx(Number(e.target.value))}
            className="w-full text-xs border border-teal-100 rounded-lg px-2 py-1.5 mb-2 bg-teal-50/50 text-teal-700 focus:outline-none focus:border-teal-400"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {activeVariants.map((v, idx) => {
              const label = Object.entries(v.attributes || {}).filter(([, val]) => val).map(([, val]) => val).join(" · ") || `Variant ${idx + 1}`;
              return <option key={v._id} value={idx}>{label} — ₹{v.price.selling}/{v.priceUnit}</option>;
            })}
          </select>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-teal-600 font-black text-base" style={{ fontFamily: "'DM Mono', monospace" }}>
              ₹{variant.price.selling.toFixed(2)}
              <span className="text-teal-400 font-normal text-xs">/{variant.priceUnit}</span>
            </p>
            <p className="text-teal-400 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Stock: {variant.quantity.inStock} {variant.quantity.baseUnit}
            </p>
          </div>
          {inCart && (
            <span className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
              In cart ✓
            </span>
          )}
        </div>

        <TealBtn
          onClick={() => onAddToCart(product, variant)}
          disabled={outOfStock}
          variant={inCart ? "outline" : "solid"}
          size="sm"
          className="w-full justify-center"
        >
          {inCart ? (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg> Added</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Add to Order</>
          )}
        </TealBtn>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   CART ITEM ROW
───────────────────────────────────────────────────────────── */

const CartItemRow = ({ item, onUpdate, onRemove }) => {
  const isLoose = item.sellMode === "loose";
  const maxStock = item.variantStock;

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-teal-50 hover:border-teal-100 bg-white hover:bg-teal-50/30 transition-all">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-teal-900 text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.productName}</p>
        <p className="text-teal-500 text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
          {item.variantLabel} · ₹{item.unitPrice}/{item.priceUnit}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Quantity */}
        <div className="flex items-center border-2 border-teal-100 rounded-xl overflow-hidden">
          <button onClick={() => onUpdate(item.key, Math.max(isLoose ? 100 : 1, item.quantity - (isLoose ? 100 : 1)))}
            className="px-2.5 py-1.5 text-teal-500 hover:bg-teal-50 text-sm font-bold transition-colors">−</button>
          <input
            type="number"
            min={isLoose ? 100 : 1}
            max={maxStock}
            step={isLoose ? 100 : 1}
            value={item.quantity}
            onChange={e => onUpdate(item.key, Math.max(1, Math.min(maxStock, Number(e.target.value))))}
            className="w-16 text-center text-sm font-bold text-teal-800 border-x-2 border-teal-100 py-1.5 focus:outline-none focus:bg-teal-50"
            style={{ fontFamily: "'DM Mono', monospace" }}
          />
          <button onClick={() => onUpdate(item.key, Math.min(maxStock, item.quantity + (isLoose ? 100 : 1)))}
            className="px-2.5 py-1.5 text-teal-500 hover:bg-teal-50 text-sm font-bold transition-colors">+</button>
        </div>

        {/* Subtotal */}
        <p className="text-teal-700 font-black text-sm w-20 text-right" style={{ fontFamily: "'DM Mono', monospace" }}>
          ₹{item.subtotal.toFixed(2)}
        </p>

        {/* Remove */}
        <button onClick={() => onRemove(item.key)}
          className="text-red-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   NEW ORDER PANEL (slide-over)
───────────────────────────────────────────────────────────── */

const NewOrderPanel = ({ onClose, onOrderCreated }) => {
  const [step, setStep] = useState("products"); // "products" | "cart" | "confirm"
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 8;

  const [cartItems, setCartItems] = useState([]);

  // Customer + order info
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Filter products
  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    if (!p.isActive) return false;
    if (productCategory && p.category?._id !== productCategory) return false;
    if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
    return true;
  });
  const totalProductPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const pagedProducts = filteredProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);

  const handleAddToCart = (product, variant) => {
    const key = `${product._id}__${variant._id}`;
    const existing = cartItems.find(c => c.key === key);
    if (existing) return; // already in cart

    const attrLabel = Object.entries(variant.attributes || {}).filter(([, v]) => v).map(([, v]) => v).join(" · ") || "Default";
    const isLoose = variant.sellMode === "loose";
    const defaultQty = isLoose ? 1000 : 1;

    const calcSubtotal = (qty) => {
      if (variant.priceUnit === "pcs") return qty * variant.price.selling;
      if (variant.priceUnit === "kg") return (qty / 1_000_000) * variant.price.selling;
      return (qty / 1000) * variant.price.selling;
    };

    setCartItems(prev => [...prev, {
      key,
      productId: product._id,
      variantId: variant._id,
      productName: product.name,
      variantLabel: attrLabel,
      sellMode: variant.sellMode,
      unit: variant.quantity.baseUnit,
      priceUnit: variant.priceUnit,
      unitPrice: variant.price.selling,
      quantity: defaultQty,
      variantStock: variant.quantity.inStock,
      subtotal: calcSubtotal(defaultQty),
    }]);
  };

  const handleUpdateQty = (key, newQty) => {
    setCartItems(prev => prev.map(c => {
      if (c.key !== key) return c;
      const calcSubtotal = (qty) => {
        if (c.priceUnit === "pcs") return qty * c.unitPrice;
        if (c.priceUnit === "kg") return (qty / 1_000_000) * c.unitPrice;
        return (qty / 1000) * c.unitPrice;
      };
      return { ...c, quantity: newQty, subtotal: calcSubtotal(newQty) };
    }));
  };

  const handleRemoveItem = (key) => setCartItems(prev => prev.filter(c => c.key !== key));

  const totalAmount = cartItems.reduce((s, c) => s + c.subtotal, 0);
  const discountNum = Math.min(Number(discount) || 0, totalAmount);
  const finalAmount = totalAmount - discountNum;

  const handleCreateOrder = async () => {
    setCreating(true);
    setCreateError("");
    try {
      // Replace with actual API call:
      // await createOrder({ customer: customer.name ? customer : null, items: ..., discount: discountNum, paymentMethod })
      await new Promise(r => setTimeout(r, 1200)); // mock delay
      onOrderCreated?.();
      onClose();
    } catch (e) {
      setCreateError(e?.response?.data?.message || "Failed to create order.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-teal-950/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-5xl h-full bg-white shadow-2xl shadow-teal-900/20 flex flex-col overflow-hidden animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h2 className="font-black text-lg tracking-tight">New Order</h2>
              <p className="text-teal-200 text-xs">{cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in cart</p>
            </div>
          </div>

          {/* Step tabs */}
          <div className="flex items-center gap-1 bg-teal-800/50 rounded-xl p-1">
            {[
              { id: "products", label: "Products" },
              { id: "cart", label: `Cart (${cartItems.length})` },
              { id: "confirm", label: "Confirm" },
            ].map((s, i) => (
              <button key={s.id}
                onClick={() => (s.id !== "confirm" || cartItems.length > 0) && setStep(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${step === s.id ? "bg-white text-teal-700" : "text-teal-200 hover:text-white"}`}>
                {s.label}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-teal-800/50 rounded-xl transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* STEP: PRODUCTS */}
        {step === "products" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-teal-50 bg-teal-50/30 flex-shrink-0 flex-wrap">
              <SearchBar value={productSearch} onChange={v => { setProductSearch(v); setProductPage(1); }} placeholder="Search products..." />
              <Select
                value={productCategory}
                onChange={v => { setProductCategory(v); setProductPage(1); }}
                options={CATEGORIES.map(c => ({ value: c._id, label: c.name }))}
              />
              <div className="ml-auto text-sm text-teal-500">{filteredProducts.length} products</div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {pagedProducts.length === 0 ? (
                <EmptyState message="No products found." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pagedProducts.map(p => (
                    <ProductCard key={p._id} product={p} onAddToCart={handleAddToCart} cartItems={cartItems} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex-shrink-0">
              <Pagination page={productPage} totalPages={totalProductPages} total={filteredProducts.length} limit={PRODUCTS_PER_PAGE} onChange={setProductPage} />
            </div>

            {/* Cart CTA */}
            {cartItems.length > 0 && (
              <div className="px-6 py-4 border-t border-teal-100 bg-white flex-shrink-0 flex items-center justify-between">
                <p className="text-sm text-teal-600 font-semibold">{cartItems.length} item(s) · ₹{totalAmount.toFixed(2)}</p>
                <TealBtn onClick={() => setStep("cart")} size="md">
                  View Cart
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </TealBtn>
              </div>
            )}
          </div>
        )}

        {/* STEP: CART */}
        {step === "cart" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <EmptyState message="Your cart is empty." />
                  <TealBtn onClick={() => setStep("products")} variant="outline">
                    Browse Products
                  </TealBtn>
                </div>
              ) : (
                <div className="space-y-2 max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-teal-900 text-base">Cart Items</h3>
                    <TealBtn onClick={() => setStep("products")} variant="ghost" size="sm">
                      + Add More
                    </TealBtn>
                  </div>
                  {cartItems.map(item => (
                    <CartItemRow key={item.key} item={item} onUpdate={handleUpdateQty} onRemove={handleRemoveItem} />
                  ))}

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-teal-50 rounded-2xl border border-teal-100 max-w-sm ml-auto">
                    <div className="flex justify-between text-sm text-teal-700 mb-2">
                      <span>Subtotal</span>
                      <span className="font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-teal-700 mb-3 items-center">
                      <span>Discount</span>
                      <div className="flex items-center gap-1">
                        <span className="text-teal-500">₹</span>
                        <input
                          type="number" min={0} max={totalAmount} value={discount}
                          onChange={e => setDiscount(e.target.value)}
                          className="w-20 text-right border border-teal-200 rounded-lg px-2 py-0.5 text-sm font-bold text-teal-800 focus:outline-none focus:border-teal-400"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-black text-teal-900 text-base border-t border-teal-200 pt-2">
                      <span>Total</span>
                      <span style={{ fontFamily: "'DM Mono', monospace" }}>₹{finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-teal-100 bg-white flex-shrink-0 flex items-center justify-between">
              <TealBtn onClick={() => setStep("products")} variant="outline">
                ← Back to Products
              </TealBtn>
              <TealBtn onClick={() => setStep("confirm")} disabled={cartItems.length === 0}>
                Proceed to Confirm →
              </TealBtn>
            </div>
          </div>
        )}

        {/* STEP: CONFIRM */}
        {step === "confirm" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <h3 className="font-black text-teal-900 text-base">Order Details</h3>

              {/* Customer */}
              <div className="bg-teal-50/50 rounded-2xl border border-teal-100 p-5">
                <h4 className="font-bold text-teal-700 text-sm mb-4 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  Customer Info <span className="text-teal-400 font-normal">(optional)</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "name", label: "Full Name", placeholder: "Customer name", type: "text" },
                    { key: "phone", label: "Phone", placeholder: "+91 9876543210", type: "tel" },
                    { key: "email", label: "Email", placeholder: "email@example.com", type: "email", span: 2 },
                  ].map(f => (
                    <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                      <label className="block text-xs font-bold text-teal-600 mb-1">{f.label}</label>
                      <input
                        type={f.type} value={customer[f.key]}
                        onChange={e => setCustomer(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 border-2 border-teal-100 rounded-xl text-sm focus:outline-none focus:border-teal-400 text-teal-900 placeholder-teal-300"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="bg-teal-50/50 rounded-2xl border border-teal-100 p-5">
                <h4 className="font-bold text-teal-700 text-sm mb-4 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Payment Method
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {["cash", "card", "online", "other"].map(pm => (
                    <button key={pm} onClick={() => setPaymentMethod(pm)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all capitalize ${paymentMethod === pm ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-600 hover:border-teal-300"}`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-2xl border-2 border-teal-100 overflow-hidden">
                <div className="px-4 py-3 bg-teal-50/50 border-b border-teal-100">
                  <h4 className="font-bold text-teal-700 text-sm">Order Summary</h4>
                </div>
                <div className="p-4 space-y-2">
                  {cartItems.map(item => (
                    <div key={item.key} className="flex justify-between text-sm">
                      <span className="text-teal-800">{item.productName} <span className="text-teal-400 text-xs">×{item.quantity}</span></span>
                      <span className="font-bold text-teal-700" style={{ fontFamily: "'DM Mono', monospace" }}>₹{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-teal-100 pt-3 mt-2 space-y-1">
                    <div className="flex justify-between text-sm text-teal-600"><span>Subtotal</span><span style={{ fontFamily: "'DM Mono', monospace" }}>₹{totalAmount.toFixed(2)}</span></div>
                    {discountNum > 0 && <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span style={{ fontFamily: "'DM Mono', monospace" }}>-₹{discountNum.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-black text-teal-900 text-base pt-1"><span>Final Total</span><span style={{ fontFamily: "'DM Mono', monospace" }}>₹{finalAmount.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-semibold">
                  ⚠ {createError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm footer */}
        {step === "confirm" && (
          <div className="px-6 py-4 border-t border-teal-100 bg-white flex-shrink-0 flex items-center justify-between">
            <TealBtn onClick={() => setStep("cart")} variant="outline">
              ← Back to Cart
            </TealBtn>
            <TealBtn onClick={handleCreateOrder} disabled={creating || cartItems.length === 0}>
              {creating ? <><Spinner size={16} /> Creating…</> : "✓ Create Order"}
            </TealBtn>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ORDERS TABLE
───────────────────────────────────────────────────────────── */

const OrdersTable = ({ onViewOrder, onUpdateStatus }) => {
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  // Filter mock data
  const filtered = MOCK_ORDERS.filter(o => {
    if (orderStatus && o.orderStatus !== orderStatus) return false;
    if (paymentStatus && o.paymentStatus !== paymentStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const paged = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-white rounded-2xl border border-teal-100 overflow-hidden shadow-sm shadow-teal-50">
      {/* Table header filters */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-teal-50 bg-gradient-to-r from-teal-50/60 to-white flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-teal-900 text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>All Orders</h3>
          <p className="text-teal-400 text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{filtered.length} total records</p>
        </div>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Order # or customer…" />
        <Select
          value={orderStatus}
          onChange={v => { setOrderStatus(v); setPage(1); }}
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
          onChange={v => { setPaymentStatus(v); setPage(1); }}
          options={[
            { value: "", label: "All Payment" },
            { value: "pending", label: "Pending" },
            { value: "paid", label: "Paid" },
            { value: "partial", label: "Partial" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
      </div>

      {/* Table */}
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
            {paged.length === 0 ? (
              <tr><td colSpan={8}><EmptyState message="No orders found." /></td></tr>
            ) : paged.map((order, idx) => (
              <tr key={order._id} className={`border-b border-teal-50 transition-colors hover:bg-teal-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-teal-50/10"}`}>
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
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
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

      <Pagination page={page} totalPages={totalPages} total={filtered.length} limit={LIMIT} onChange={setPage} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */

export default function OrdersPage() {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [orderCreated, setOrderCreated] = useState(false);

  const handleOrderCreated = () => {
    setOrderCreated(true);
    setTimeout(() => setOrderCreated(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-teal-50/20 p-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-teal-900 tracking-tight">Orders</h1>
          <p className="text-teal-500 mt-1 text-sm">Manage and track all customer orders</p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Orders", value: MOCK_ORDERS.length, icon: "📦", color: "from-teal-50 to-white border-teal-100" },
          { label: "Pending", value: MOCK_ORDERS.filter(o => o.orderStatus === "pending").length, icon: "⏳", color: "from-amber-50 to-white border-amber-100" },
          { label: "Delivered", value: MOCK_ORDERS.filter(o => o.orderStatus === "delivered").length, icon: "✅", color: "from-green-50 to-white border-green-100" },
          { label: "Revenue", value: "₹" + MOCK_ORDERS.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.finalAmount, 0).toLocaleString("en-IN"), icon: "💰", color: "from-teal-50 to-white border-teal-100" },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} border rounded-2xl p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-black text-teal-900 mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>{s.value}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <OrdersTable onViewOrder={setViewingOrder} onUpdateStatus={setUpdatingOrder} />

      {/* New Order Panel */}
      {showNewOrder && (
        <NewOrderPanel onClose={() => setShowNewOrder(false)} onOrderCreated={handleOrderCreated} />
      )}

      {/* Modals — import from OrderModals.jsx */}
      {viewingOrder && (
        <ViewOrderModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      )}
      {updatingOrder && (
        <UpdateStatusModal order={updatingOrder} onClose={() => setUpdatingOrder(null)}
          onUpdated={() => { setUpdatingOrder(null); }} />
      )}

      <style>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease both; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   INLINE MODAL STUBS (full versions in OrderModals.jsx)
───────────────────────────────────────────────────────────── */

function ViewOrderModal({ order, onClose }) {
  const formatDate = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

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
          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge status={order.orderStatus} type="order" />
            <Badge status={order.paymentStatus} type="payment" />
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-600 border border-teal-100 capitalize">
              {order.paymentMethod}
            </span>
          </div>

          {/* Customer */}
          {order.customer && (
            <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100">
              <p className="text-xs font-bold text-teal-500 uppercase mb-2">Customer</p>
              <p className="font-bold text-teal-900">{order.customer.name}</p>
              <p className="text-sm text-teal-600">{order.customer.phone}</p>
              {order.customer.email && <p className="text-sm text-teal-500">{order.customer.email}</p>}
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-teal-500 uppercase mb-2">Items</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-teal-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-teal-900">
                      {typeof item.product === "object" ? item.product.name : "Product"}
                    </p>
                    <p className="text-xs text-teal-400">Qty: {item.quantity} {item.unit}</p>
                  </div>
                  <span className="font-bold text-teal-700 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                    ₹{item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
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

function UpdateStatusModal({ order, onClose, onUpdated }) {
  const [orderStatus, setOrderStatus] = useState(order.orderStatus);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Replace with: await updateOrderStatus(order._id, { orderStatus, paymentStatus })
      await new Promise(r => setTimeout(r, 800));
      onUpdated?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update.");
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
              {["pending", "confirmed", "ready", "delivered", "cancelled"].map(s => (
                <button key={s} onClick={() => setOrderStatus(s)}
                  className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all capitalize flex items-center gap-2 ${orderStatus === s ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-600 hover:border-teal-300"}`}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ORDER_STATUS_CONFIG[s]?.dot }} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-teal-600 uppercase mb-2">Payment Status</label>
            <div className="grid grid-cols-2 gap-2">
              {["pending", "paid", "partial", "refunded"].map(s => (
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

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-semibold">⚠ {error}</div>}
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