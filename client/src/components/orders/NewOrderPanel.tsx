import { useCallback, useEffect, useRef, useState } from "react";
import type { GetProductsParams, Product, ProductVariant } from "../../types/product";
import type { CartItem, CreateOrderPayload, PaginationMeta, PaymentMethod, PaymentStatus } from "../../types/order";
import { getCategories } from "../../apis/category";
import { getProducts } from "../../apis/product";
import { createOrder } from "../../apis/order";
import { EmptyState, Select, Spinner, TealBtn } from "./OrderUi";
import { CartItemRow } from "./CartItemRow";
import { SearchBar } from "../SearchBar";
import { ProductCard } from "./ProductCard";
import { formatQuantityForUser } from "../../utils/productUnits";

// ─────────────────────────────────────────────────────────────
//  PAGINATION
// ─────────────────────────────────────────────────────────────

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}
export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, limit, onChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  type PageItem = number | "...";

  const pages: number[] = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  const withEllipsis = pages.reduce<PageItem[]>((acc, p, idx, arr) => {
    if (idx > 0 && arr[idx - 1] < p - 1) acc.push("...");
    acc.push(p);
    return acc;
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-teal-50 bg-gradient-to-r from-teal-50/60 to-white">
      <span className="text-sm text-teal-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border-2 border-teal-100 text-teal-600 text-sm font-bold disabled:opacity-30 hover:border-teal-400 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>← Prev</button>
        {withEllipsis.map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-2 text-teal-400 text-sm">…</span>
          ) : (
            <button key={i} onClick={() => onChange(p as number)}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-colors ${page === p ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-600 hover:border-teal-400"}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}>{p}</button>
          )
        )}
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border-2 border-teal-100 text-teal-600 text-sm font-bold disabled:opacity-30 hover:border-teal-400 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>Next →</button>
      </div>
    </div>
  );
};

type NewOrderStep = "products" | "cart" | "confirm";

interface NewOrderPanelProps {
  onClose: () => void;
  onOrderCreated: () => void;
}
export const NewOrderPanel: React.FC<NewOrderPanelProps> = ({ onClose, onOrderCreated }) => {
  const [step, setStep] = useState<NewOrderStep>("products");

  // Product browse state
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [productPagination, setProductPagination] = useState<PaginationMeta | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const PRODUCTS_PER_PAGE = 8;

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Confirm form
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [discount, setDiscount] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Fetch categories once
  useEffect(() => {
    getCategories()
      .then((res) => {
        setCategories(
          (res.data?.results ?? []).map((c) => ({
            _id: c.id,
            name: c.name,
          }))
        );
      })
      .catch(() => { });
  }, []);

  // Fetch products on filter/page change
  const fetchProducts = useCallback(async () => {
    setProductLoading(true);
    try {
      const params: GetProductsParams = {
        page: productPage,
        limit: PRODUCTS_PER_PAGE,
        isActive: true,
      };
      if (productSearch.trim()) params.search = productSearch.trim();
      if (productCategory) params.category = productCategory;

      const res = await getProducts(params);
      setProducts(res.data ?? []);
      if (res.pagination) setProductPagination(res.pagination);
    } catch {
      setProducts([]);
    } finally {
      setProductLoading(false);
    }
  }, [productPage, productSearch, productCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setProductSearch(val);
    setProductPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { }, 300);
  };

  // Cart helpers
  const calcSubtotal = (qty: number, priceUnit: string, unitPrice: number): number => {
    if (priceUnit === "pcs") return qty * unitPrice;
    if (priceUnit === "kg") return (qty / 1_000_000) * unitPrice;
    return (qty / 1000) * unitPrice;
  };

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    const key = `${product._id}__${variant._id}`;
    if (cartItems.find(c => c.key === key)) return;

    const attrLabel =
      Object.entries(variant.attributes ?? {})
        .filter(([, v]) => v)
        .map(([, v]) => v)
        .join(" · ") || "Default";

    const isLoose = variant.sellMode === "loose";
    const defaultQty = isLoose
      ? variant.quantity.baseUnit === "mg"
        ? 1000 // 1 g stored as mg
        : 1    // 1 ml
      : 1;
    setCartItems(prev => [
      ...prev,
      {
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
        subtotal: calcSubtotal(defaultQty, variant.priceUnit, variant.price.selling),
      },
    ]);
  };

  const handleUpdateQty = (key: string, newQty: number) => {
    setCartItems(prev =>
      prev.map(c =>
        c.key !== key
          ? c
          : { ...c, quantity: newQty, subtotal: calcSubtotal(newQty, c.priceUnit, c.unitPrice) }
      )
    );
  };

  const handleRemoveItem = (key: string) => setCartItems(prev => prev.filter(c => c.key !== key));

  const totalAmount = cartItems.reduce((s, c) => s + c.subtotal, 0);
  const discountNum = Math.min(Number(discount) || 0, totalAmount);
  const finalAmount = totalAmount - discountNum;

  const handleCreateOrder = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const payload: CreateOrderPayload = {
        customer: customer.name ? { ...customer } : null,
        items: cartItems.map(c => ({
          product: c.productId,
          variant: c.variantId,
          quantity: c.quantity,
          unit: c.unit,
          sellMode: c.sellMode,
          priceUnit: c.priceUnit,
        })),
        discount: discountNum,
        paymentMethod,
        paymentStatus,
        orderStatus: "delivered",
      };
      await createOrder(payload);
      onOrderCreated();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setCreateError(err?.response?.data?.message ?? "Failed to create order.");
    } finally {
      setCreating(false);
    }
  };

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map(c => ({ value: c._id, label: c.name })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-teal-950/30 backdrop-blur-sm" onClick={onClose} />

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

          <div className="flex items-center gap-1 bg-teal-800/50 rounded-xl p-1">
            {(["products", "cart", "confirm"] as NewOrderStep[]).map(s => (
              <button key={s}
                onClick={() => { if (s !== "confirm" || cartItems.length > 0) setStep(s); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${step === s ? "bg-white text-teal-700" : "text-teal-200 hover:text-white"}`}>
                {s === "cart" ? `Cart (${cartItems.length})` : s}
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
            <div className="flex items-center gap-3 px-6 py-4 border-b border-teal-50 bg-teal-50/30 flex-shrink-0 flex-wrap">
              <SearchBar value={productSearch} onChange={handleSearchChange} placeholder="Search products..." />
              <Select
                value={productCategory}
                onChange={v => { setProductCategory(v); setProductPage(1); }}
                options={categoryOptions}
              />
              <div className="ml-auto text-sm text-teal-500">
                {productPagination ? `${productPagination.total} products` : ""}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {productLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner size={32} />
                </div>
              ) : products.length === 0 ? (
                <EmptyState message="No products found." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(p => (
                    <ProductCard key={p._id} product={p} onAddToCart={handleAddToCart} cartItems={cartItems} />
                  ))}
                </div>
              )}
            </div>

            {productPagination && productPagination.totalPages > 1 && (
              <div className="flex-shrink-0">
                <Pagination
                  page={productPage}
                  totalPages={productPagination.totalPages}
                  total={productPagination.total}
                  limit={PRODUCTS_PER_PAGE}
                  onChange={setProductPage}
                />
              </div>
            )}

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
                  <TealBtn onClick={() => setStep("products")} variant="outline">Browse Products</TealBtn>
                </div>
              ) : (
                <div className="space-y-2 max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-teal-900 text-base">Cart Items</h3>
                    <TealBtn onClick={() => setStep("products")} variant="ghost" size="sm">+ Add More</TealBtn>
                  </div>
                  {cartItems.map(item => (
                    <CartItemRow key={item.key} item={item} onUpdate={handleUpdateQty} onRemove={handleRemoveItem} />
                  ))}

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
              <TealBtn onClick={() => setStep("products")} variant="outline">← Back to Products</TealBtn>
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
                  {([
                    { key: "name", label: "Full Name", placeholder: "Customer name", type: "text" },
                    { key: "phone", label: "Phone", placeholder: "+91 9876543210", type: "tel" },
                    { key: "email", label: "Email", placeholder: "email@example.com", type: "email", span: 2 },
                  ] as { key: keyof typeof customer; label: string; placeholder: string; type: string; span?: number }[]).map(f => (
                    <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                      <label className="block text-xs font-bold text-teal-600 mb-1">{f.label}</label>
                      <input
                        type={f.type}
                        value={customer[f.key]}
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
                  {(["cash", "card", "online", "other"] as PaymentMethod[]).map(pm => (
                    <button key={pm} onClick={() => setPaymentMethod(pm)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all capitalize ${paymentMethod === pm ? "bg-teal-600 border-teal-600 text-white" : "border-teal-100 text-teal-600 hover:border-teal-300"}`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-bold text-teal-700 text-sm mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Payment Status
                </h4>

                <div className="flex gap-2 flex-wrap">
                  {(["paid", "pending", "partial"] as PaymentStatus[]).map((ps) => (
                    <button
                      key={ps}
                      onClick={() => setPaymentStatus(ps)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all capitalize ${paymentStatus === ps
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-teal-100 text-teal-600 hover:border-teal-300"
                        }`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {ps}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border-2 border-teal-100 overflow-hidden">
                <div className="px-4 py-3 bg-teal-50/50 border-b border-teal-100">
                  <h4 className="font-bold text-teal-700 text-sm">Order Summary</h4>
                </div>
                <div className="p-4 space-y-2">
                  {cartItems.map(item => (
                    <div key={item.key} className="flex justify-between text-sm">
                      <span className="text-teal-800">
                        {item.productName}{" "}
                        <span className="text-teal-400 text-xs">
                          ×{item.sellMode === "loose" ? formatQuantityForUser(item.quantity, item.unit) : item.quantity}
                        </span>
                      </span>
                      <span className="font-bold text-teal-700" style={{ fontFamily: "'DM Mono', monospace" }}>₹{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-teal-100 pt-3 mt-2 space-y-1">
                    <div className="flex justify-between text-sm text-teal-600">
                      <span>Subtotal</span>
                      <span style={{ fontFamily: "'DM Mono', monospace" }}>₹{totalAmount.toFixed(2)}</span>
                    </div>
                    {discountNum > 0 && (
                      <div className="flex justify-between text-sm text-red-500">
                        <span>Discount</span>
                        <span style={{ fontFamily: "'DM Mono', monospace" }}>-₹{discountNum.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-teal-900 text-base pt-1">
                      <span>Final Total</span>
                      <span style={{ fontFamily: "'DM Mono', monospace" }}>₹{finalAmount.toFixed(2)}</span>
                    </div>
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

        {step === "confirm" && (
          <div className="px-6 py-4 border-t border-teal-100 bg-white flex-shrink-0 flex items-center justify-between">
            <TealBtn onClick={() => setStep("cart")} variant="outline">← Back to Cart</TealBtn>
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
    </div >
  );
};