/**
 * ProductsPage.tsx
 *
 * Improvements:
 * 1. ✅ Mobile hamburger overlap fix — pt: 84px on mobile (same as Orders/Category)
 * 2. ✅ Mobile product card view — replaces DataTable on small screens with rich cards
 *    showing image placeholder, type badge, stock indicator, price, status pill,
 *    and 3 action buttons (View / Edit / Delete)
 * 3. ✅ Responsive filter bar — stacks to full-width on mobile
 * 4. ✅ Responsive header — stacks on mobile with full-width "Add Product" button
 * 5. ✅ Mobile pagination — simple Prev / Next with page indicator
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import DataTable, { type Column, type TableAction } from "../components/DataTable";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../apis/product";
import {
  ProductFormModal,
  ViewProductModal,
  DeleteProductModal,
} from "../components/ProductModals";
import { getCategories } from "../apis/category";
import {
  type Product,
  type GetProductsParams,
  type CreateProductPayload,
  type UpdateProductPayload,
} from "../types/product";

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
   ICONS
───────────────────────────────────────────────────────────── */

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
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
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   BADGES
───────────────────────────────────────────────────────────── */

type ProductType = "animal" | "food" | "accessory" | "medicine" | "other";

const TYPE_CFG: Record<ProductType, { bg: string; color: string; icon: string }> = {
  food: { bg: "#dcfce7", color: "#166534", icon: "🍖" },
  animal: { bg: "#dbeafe", color: "#1e40af", icon: "🐾" },
  accessory: { bg: "#fef9c3", color: "#854d0e", icon: "🎀" },
  medicine: { bg: "#fce7f3", color: "#9d174d", icon: "💊" },
  other: { bg: "#f3f4f6", color: "#374151", icon: "📦" },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CFG[type as ProductType] ?? TYPE_CFG.other;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, textTransform: "capitalize",
      whiteSpace: "nowrap",
    }}>
      <span>{cfg.icon}</span>
      {type}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20,
      background: active ? "#d1fae5" : "#fee2e2",
      color: active ? "#065f46" : "#991b1b",
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: active ? "#10b981" : "#ef4444",
      }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROW TYPE
───────────────────────────────────────────────────────────── */

interface ProductRow {
  id: string;
  name: string;
  type: string;
  category: string;
  variants: number;
  minPrice: number;
  stock: number;
  status: boolean;
  _raw: Product;
}

const toRow = (p: Product): ProductRow => ({
  id: p._id,
  name: p.name,
  type: p.type,
  category: p.category?.name ?? "—",
  variants: p.variants.length,
  minPrice: p.variants.length ? Math.min(...p.variants.map(v => v.price.selling)) : 0,
  stock: p.variants.reduce((acc, v) => acc + v.quantity.inStock, 0),
  status: p.isActive,
  _raw: p,
});

/* ─────────────────────────────────────────────────────────────
   MOBILE PRODUCT CARD
───────────────────────────────────────────────────────────── */

interface ProductCardProps {
  row: ProductRow;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ row, onView, onEdit, onDelete }) => {
  const typeCfg = TYPE_CFG[row.type as ProductType] ?? TYPE_CFG.other;

  // Stock urgency
  const stockColor = row.stock === 0
    ? { color: "#991b1b", bg: "#fee2e2", label: "Out of stock" }
    : row.stock < 10
      ? { color: "#9a3412", bg: "#fed7aa", label: "Low stock" }
      : { color: "#065f46", bg: "#d1fae5", label: "In stock" };

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e0f2f1",
      boxShadow: "0 2px 12px rgba(15,118,110,0.06)",
      overflow: "hidden",
      marginBottom: 10,
    }}>
      {/* Top accent stripe */}
      <div style={{ height: 3, background: typeCfg.color, opacity: 0.5 }} />

      <div style={{ padding: "14px 14px 12px" }}>

        {/* Row 1: icon + name + status */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          {/* Type icon circle */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: typeCfg.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, border: `1.5px solid ${typeCfg.color}22`,
          }}>
            {typeCfg.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontWeight: 900, fontSize: 14,
              color: "#0f4f4a", lineHeight: 1.25,
              fontFamily: "'DM Sans', sans-serif",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {row.name}
            </p>
            <p style={{
              margin: "3px 0 0", fontSize: 11, color: "#5eaaa0",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {row.category}
            </p>
          </div>

          {/* Status pill top-right */}
          <StatusBadge active={row.status} />
        </div>

        {/* Row 2: 2×2 stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "8px 12px",
          padding: "10px 12px",
          background: "#f0fdfa",
          borderRadius: 12,
          marginBottom: 12,
          border: "1px solid #ccfbf1",
        }}>
          {/* Type */}
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#5eaaa0", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Type
            </p>
            <div style={{ marginTop: 4 }}>
              <TypeBadge type={row.type} />
            </div>
          </div>

          {/* Variants */}
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#5eaaa0", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Variants
            </p>
            <p style={{
              margin: "4px 0 0", fontWeight: 900, fontSize: 18,
              color: "#0f766e", fontFamily: "'DM Mono', monospace", lineHeight: 1,
            }}>
              {row.variants}
            </p>
          </div>

          {/* Price */}
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#5eaaa0", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              From (₹)
            </p>
            <p style={{
              margin: "4px 0 0", fontWeight: 900, fontSize: 16,
              color: "#0f4f4a", fontFamily: "'DM Mono', monospace", lineHeight: 1,
            }}>
              ₹{row.minPrice.toFixed(2)}
            </p>
          </div>

          {/* Stock */}
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#5eaaa0", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Stock
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <p style={{
                margin: 0, fontWeight: 900, fontSize: 18, lineHeight: 1,
                color: stockColor.color, fontFamily: "'DM Mono', monospace",
              }}>
                {row.stock}
              </p>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px",
                borderRadius: 8, background: stockColor.bg, color: stockColor.color,
              }}>
                {stockColor.label}
              </span>
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div style={{ display: "flex", gap: 7 }}>
          <button
            onClick={() => onView(row._raw)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10,
              border: "1.5px solid #0d9488", background: "#fff",
              color: "#0d9488", fontSize: 12, fontWeight: 800,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 5,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <EyeIcon /> View
          </button>
          <button
            onClick={() => onEdit(row._raw)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10,
              border: "1.5px solid #3b82f6", background: "#eff6ff",
              color: "#1d4ed8", fontSize: 12, fontWeight: 800,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 5,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <EditIcon /> Edit
          </button>
          <button
            onClick={() => onDelete(row._raw)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10,
              border: "1.5px solid #ef4444", background: "#fef2f2",
              color: "#dc2626", fontSize: 12, fontWeight: 800,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 5,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <TrashIcon /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MOBILE PAGINATION
───────────────────────────────────────────────────────────── */

const MobilePagination: React.FC<{
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}> = ({ page, totalPages, total, limit, onChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px",
      background: "linear-gradient(135deg, #f0fdfa 0%, #fff 100%)",
      borderTop: "1px solid #e0f2f1",
      borderRadius: "0 0 16px 16px",
    }}>
      <span style={{ fontSize: 12, color: "#5eaaa0", fontFamily: "'DM Sans', sans-serif" }}>
        {from}–{to} of {total}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "1.5px solid #ccf0ec",
            background: page === 1 ? "#f8fffe" : "#fff",
            color: page === 1 ? "#b0d8d4" : "#0d9488",
            cursor: page === 1 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevronLeft />
        </button>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 12px", borderRadius: 10,
          background: "#f0fdfa", border: "1.5px solid #ccf0ec",
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#0f766e", fontFamily: "'DM Mono', monospace" }}>
            {page}
          </span>
          <span style={{ fontSize: 12, color: "#5eaaa0" }}>/ {totalPages}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "1.5px solid #ccf0ec",
            background: page === totalPages ? "#f8fffe" : "#fff",
            color: page === totalPages ? "#b0d8d4" : "#0d9488",
            cursor: page === totalPages ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   DESKTOP COLUMNS (unchanged from original)
───────────────────────────────────────────────────────────── */

const columns: Column<ProductRow>[] = [
  {
    key: "name",
    label: "Product",
    sortable: true,
    render: (row) => (
      <div>
        <div className="font-bold text-teal-900 text-sm">{row.name}</div>
        <div className="text-[11px] text-teal-400 mt-0.5">{row.category}</div>
      </div>
    ),
  },
  { key: "type", label: "Type", render: (row) => <TypeBadge type={row.type} /> },
  {
    key: "variants", label: "Variants", align: "center",
    render: (row) => (
      <span className="bg-teal-100 text-teal-700 rounded-lg px-3 py-0.5 font-bold text-sm">{row.variants}</span>
    ),
  },
  {
    key: "minPrice", label: "From (₹)", align: "center", sortable: true,
    render: (row) => <span className="font-bold text-teal-900 text-sm">₹{row.minPrice.toFixed(2)}</span>,
  },
  {
    key: "stock", label: "Stock", align: "center", sortable: true,
    render: (row) => (
      <span className={`font-bold text-sm ${row.stock < 10 ? "text-red-600" : row.stock < 30 ? "text-yellow-600" : "text-green-600"}`}>
        {row.stock}
      </span>
    ),
  },
  {
    key: "status", label: "Status", align: "center",
    render: (row) => <StatusBadge active={row.status} />,
  },
];

/* ─────────────────────────────────────────────────────────────
   PRODUCTS PAGE
───────────────────────────────────────────────────────────── */

export default function ProductsPage() {
  const isMobile = useIsMobile();

  /* ── State ── */
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastState, setToastState] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // debounced
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("true");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const LIMIT = 8;
  const totalPages = Math.max(1, Math.ceil(totalRecords / LIMIT));

  /* ── Search debounce ── */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── Fetch ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetProductsParams = {
        page, limit: LIMIT,
        isActive: filterStatus === "" ? undefined : filterStatus === "true",
      };
      if (search.trim()) params.search = search.trim();
      if (filterType) params.type = filterType as ProductType;
      if (filterCategory) params.category = filterCategory;

      const res = await getProducts(params);
      if (res.success) {
        setRows((res.data as Product[]).map(toRow));
        setTotalRecords(res.pagination?.total ?? (res.data as unknown[]).length);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message ?? "Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterCategory, filterStatus]);

  const fetchMeta = useCallback(async () => {
    try {
      const catRes = await getCategories({ limit: 100 });
      setCategories(catRes.data.results.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  /* ── Toast ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastState({ msg, type });
    setTimeout(() => setToastState(null), 3500);
  };

  /* ── CRUD handlers ── */
  const handleCreate = async (
    payload: CreateProductPayload | UpdateProductPayload,
    imageFiles: File[][], _vi: (string | undefined)[], _ri: Record<string, string[]>
  ) => {
    setActionLoading(true);
    try {
      await createProduct(payload as CreateProductPayload, imageFiles);
      showToast("Product created successfully!");
      setCreateOpen(false); setPage(1); fetchProducts();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message ?? "Failed to create product", "error");
    } finally { setActionLoading(false); }
  };

  const handleEdit = async (
    payload: CreateProductPayload | UpdateProductPayload,
    imageFiles: File[][], variantIds: (string | undefined)[],
    removeVariantImages: Record<string, string[]>
  ) => {
    if (!editProduct) return;
    setActionLoading(true);
    try {
      await updateProduct(editProduct._id, { ...(payload as UpdateProductPayload), removeVariantImages }, imageFiles, variantIds);
      showToast("Product updated successfully!");
      setEditProduct(null); fetchProducts();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message ?? "Failed to update product", "error");
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteProduct(deleteTarget._id);
      showToast("Product deleted successfully!");
      setDeleteTarget(null); fetchProducts();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message ?? "Failed to delete product", "error");
    } finally { setActionLoading(false); }
  };

  /* ── Desktop table actions ── */
  const tableActions: TableAction<ProductRow>[] = [
    { label: "View", icon: <EyeIcon />, onClick: r => setViewProduct(r._raw), color: "#5eaaa0", hoverColor: "#0d9488", hoverBg: "#f0fdfa" },
    { label: "Edit", icon: <EditIcon />, onClick: r => setEditProduct(r._raw), color: "#5eaaa0", hoverColor: "#1d4ed8", hoverBg: "#eff6ff" },
    { label: "Delete", icon: <TrashIcon />, onClick: r => setDeleteTarget(r._raw), color: "#f87171", hoverColor: "#dc2626", hoverBg: "#fef2f2" },
  ];

  const headerAction: ReactNode = (
    <div className="flex gap-2 items-center flex-wrap">
      <button
        onClick={() => setShowFilters(p => !p)}
        className={`flex items-center gap-1.5 px-3.5 py-2 border-[1.5px] rounded-xl cursor-pointer text-sm font-bold transition-colors ${showFilters ? "border-teal-500 bg-teal-50 text-teal-700" : "border-teal-100 bg-white text-teal-400 hover:bg-teal-50"}`}
      >
        <FilterIcon /> Filters
      </button>
      <button
        onClick={fetchProducts}
        className="flex items-center gap-1.5 px-3.5 py-2 border-[1.5px] border-teal-100 rounded-xl bg-white text-teal-400 cursor-pointer text-sm font-bold hover:bg-teal-50 transition-colors"
      >
        <RefreshIcon />
      </button>
      <button
        onClick={() => setCreateOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 border-none rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 text-white cursor-pointer text-sm font-bold shadow-[0_2px_8px_rgba(13,148,136,0.25)] hover:from-teal-800 hover:to-teal-600 transition-all"
      >
        <PlusIcon /> Add Product
      </button>
    </div>
  );

  const filterSelectCls =
    "w-full px-3.5 py-2.5 border-[1.5px] border-teal-100 rounded-xl text-sm text-teal-900 bg-white outline-none focus:border-teal-400 cursor-pointer transition-all font-[inherit]";

  /* ── Skeleton cards for mobile loading ── */
  const SkeletonCard = () => (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e0f2f1",
      overflow: "hidden", marginBottom: 10,
    }}>
      <div style={{ height: 3, background: "#e0f2f1" }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0fdfa" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, background: "#f0fdfa", borderRadius: 7, width: "70%", marginBottom: 6 }} />
            <div style={{ height: 11, background: "#f0fdfa", borderRadius: 7, width: "45%" }} />
          </div>
        </div>
        <div style={{ height: 72, background: "#f8fffe", borderRadius: 12, marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 7 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: 36, background: "#f0fdfa", borderRadius: 10 }} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 60%, #f0fdfa 100%)",
        fontFamily: "'DM Sans', sans-serif",
        /**
         * ✅ HAMBURGER OVERLAP FIX
         * On mobile the Sidebar renders a fixed hamburger at top:16px, h:42px.
         * 84px top padding keeps the heading safely below it.
         */
        padding: isMobile ? "84px 14px 24px" : "24px",
        boxSizing: "border-box",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* ── Toast ── */}
      {toastState && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 18px", borderRadius: 14,
          background: toastState.type === "success" ? "#f0fdfa" : "#fef2f2",
          border: `1.5px solid ${toastState.type === "success" ? "#99f6e4" : "#fecaca"}`,
          color: toastState.type === "success" ? "#0f766e" : "#dc2626",
          fontSize: 13, fontWeight: 700,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: 8,
          maxWidth: 320,
        }}>
          <span style={{ fontSize: 16 }}>{toastState.type === "success" ? "✓" : "✕"}</span>
          {toastState.msg}
        </div>
      )}

      {/* ─────────────────────── MOBILE LAYOUT ─────────────────────── */}
      {isMobile ? (
        <>
          {/* Mobile Header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0d3d38", letterSpacing: "-0.4px" }}>
                  Products
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#5eaaa0" }}>
                  {totalRecords} products · Manage your catalogue
                </p>
              </div>
              {/* Refresh */}
              <button
                onClick={fetchProducts}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  border: "1.5px solid #ccf0ec", background: "#fff",
                  color: "#0d9488", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RefreshIcon />
              </button>
            </div>

            {/* Add Product full-width */}
            <button
              onClick={() => setCreateOpen(true)}
              style={{
                width: "100%", padding: "12px 0",
                borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #0f766e, #0d9488)",
                color: "#fff", fontSize: 14, fontWeight: 900,
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(15,118,110,0.3)",
                marginBottom: 10,
              }}
            >
              <PlusIcon /> Add New Product
            </button>
          </div>

          {/* Mobile Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#9ed8d4", pointerEvents: "none",
            }}>
              <SearchIcon />
            </span>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products…"
              style={{
                width: "100%", padding: "11px 14px 11px 38px",
                border: "1.5px solid #ccf0ec", borderRadius: 12,
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                color: "#0d4f4a", background: "#fff",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Mobile Filter toggle */}
          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              width: "100%", padding: "10px 14px", marginBottom: 10,
              borderRadius: 12, cursor: "pointer",
              border: `1.5px solid ${showFilters ? "#0d9488" : "#ccf0ec"}`,
              background: showFilters ? "#f0fdfa" : "#fff",
              color: showFilters ? "#0d9488" : "#5eaaa0",
              fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <FilterIcon />
            {showFilters ? "Hide Filters" : "Show Filters"}
            {(filterType || filterCategory || filterStatus !== "true") && (
              <span style={{
                background: "#0d9488", color: "#fff",
                fontSize: 10, fontWeight: 800, width: 16, height: 16,
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {[filterType, filterCategory, filterStatus !== "true" ? filterStatus : ""].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Mobile Filters panel */}
          {showFilters && (
            <div style={{
              background: "#fff", border: "1.5px solid #ccf0ec",
              borderRadius: 14, padding: 14, marginBottom: 12,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#0d7a70", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Type
                  </label>
                  <select className={filterSelectCls} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
                    <option value="">All Types</option>
                    <option value="food">🍖 Food</option>
                    <option value="animal">🐾 Animal</option>
                    <option value="accessory">🎀 Accessory</option>
                    <option value="medicine">💊 Medicine</option>
                    <option value="other">📦 Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#0d7a70", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Status
                  </label>
                  <select className={filterSelectCls} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    <option value="true">● Active</option>
                    <option value="false">○ Inactive</option>
                    <option value="">All</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#0d7a70", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  Category
                </label>
                <select className={filterSelectCls} value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => { setFilterType(""); setFilterCategory(""); setFilterStatus("true"); setPage(1); }}
                style={{
                  width: "100%", padding: "9px 0", borderRadius: 10,
                  border: "1.5px solid #ccf0ec", background: "#fff",
                  color: "#5eaaa0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Mobile results count */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#5eaaa0", fontFamily: "'DM Mono', monospace" }}>
              {loading ? "Loading…" : `${rows.length} of ${totalRecords} shown`}
            </p>
            {(filterType || filterCategory || filterStatus !== "true") && (
              <button
                onClick={() => { setFilterType(""); setFilterCategory(""); setFilterStatus("true"); setPage(1); }}
                style={{
                  fontSize: 11, color: "#dc2626", fontWeight: 700,
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0,
                }}
              >
                × Clear filters
              </button>
            )}
          </div>

          {/* Mobile Card List */}
          <div style={{
            background: "#fff", borderRadius: 16,
            border: "1px solid #e0f2f1",
            overflow: "hidden",
            boxShadow: "0 2px 16px rgba(15,118,110,0.06)",
          }}>
            <div style={{ padding: "12px 12px 4px" }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              ) : rows.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
                  <p style={{ color: "#5eaaa0", fontSize: 14, fontWeight: 600, margin: 0 }}>No products found.</p>
                  <p style={{ color: "#9ed8d4", fontSize: 12, marginTop: 6 }}>Try adjusting your filters or search.</p>
                </div>
              ) : (
                rows.map(row => (
                  <ProductCard
                    key={row.id}
                    row={row}
                    onView={setViewProduct}
                    onEdit={setEditProduct}
                    onDelete={setDeleteTarget}
                  />
                ))
              )}
            </div>
            <MobilePagination
              page={page}
              totalPages={totalPages}
              total={totalRecords}
              limit={LIMIT}
              onChange={setPage}
            />
          </div>
        </>
      ) : (
        /* ─────────────────────── DESKTOP LAYOUT ─────────────────────── */
        <>
          {/* Desktop Page Header */}
          <div className="mb-5">
            <h1 className="m-0 text-2xl font-black text-teal-900 tracking-tight">Products</h1>
            <p className="m-0 mt-1 text-teal-400 text-sm">Manage your product catalogue</p>
          </div>

          {/* Desktop Filter Bar */}
          {showFilters && (
            <div className="bg-white border-[1.5px] border-teal-100 rounded-2xl px-5 py-4 mb-4 flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-[11px] font-bold text-teal-700 mb-1.5 uppercase tracking-wide">Type</label>
                <select className={filterSelectCls} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
                  <option value="">All Types</option>
                  <option value="food">Food</option>
                  <option value="animal">Animal</option>
                  <option value="accessory">Accessory</option>
                  <option value="medicine">Medicine</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-teal-700 mb-1.5 uppercase tracking-wide">Category</label>
                <select className={filterSelectCls} value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-teal-700 mb-1.5 uppercase tracking-wide">Status</label>
                <select className={filterSelectCls} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                  <option value="">All</option>
                </select>
              </div>
              <button
                onClick={() => { setFilterType(""); setFilterCategory(""); setFilterStatus("true"); setPage(1); }}
                className="px-3.5 py-2 border-[1.5px] border-teal-100 rounded-xl bg-white text-teal-400 cursor-pointer text-sm font-bold hover:bg-teal-50 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Desktop DataTable */}
          <DataTable<ProductRow>
            title="All Products"
            columns={columns}
            data={rows}
            actions={tableActions}
            loading={loading}
            emptyMessage="No products found."
            rowsPerPage={LIMIT}
            serverSide
            totalRecords={totalRecords}
            page={page}
            onPageChange={setPage}
            onSearch={q => { setSearch(q); setPage(1); }}
            searchPlaceholder="Search products…"
            headerAction={headerAction}
            mobileVisibleKeys={["name", "type", "minPrice", "stock", "status"]}
          />
        </>
      )}

      {/* ── Modals (shared) ── */}
      <ProductFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        categories={categories}
        loading={actionLoading}
      />
      <ProductFormModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        onSubmit={handleEdit}
        initialData={editProduct}
        categories={categories}
        loading={actionLoading}
      />
      <ViewProductModal
        open={!!viewProduct}
        onClose={() => setViewProduct(null)}
        product={viewProduct}
      />
      <DeleteProductModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        product={deleteTarget}
        loading={actionLoading}
      />

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f0fdfa; }
        ::-webkit-scrollbar-thumb { background: #0d9488; border-radius: 3px; }
      `}</style>
    </div>
  );
}