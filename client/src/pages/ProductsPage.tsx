import { useState, useEffect, useCallback, type ReactNode } from "react";
import DataTable, { type Column, type TableAction } from "../components/DataTable";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type GetProductsParams,
  type CreateProductPayload,
  type UpdateProductPayload,
} from "../apis/product";
import {
  ProductFormModal,
  ViewProductModal,
  DeleteProductModal,
} from "../components/ProductModals";

/* ─── Color palette (teal + white) ─── */
const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_LIGHT = "#ccfbf1";
const TEAL_BG = "#f0fdfa";

/* ─── Icon helpers ─── */
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

/* ─── Type / status badge helpers ─── */
type ProductType = "animal" | "food" | "accessory" | "medicine" | "other";

const TYPE_COLORS: Record<ProductType, [string, string]> = {
  food: ["#dcfce7", "#16a34a"],
  animal: ["#dbeafe", "#1d4ed8"],
  accessory: ["#fef9c3", "#ca8a04"],
  medicine: ["#fce7f3", "#be185d"],
  other: ["#f3f4f6", "#374151"],
};

function TypeBadge({ type }: { type: string }) {
  const [bg, fg] = TYPE_COLORS[type as ProductType] ?? ["#f3f4f6", "#374151"];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        borderRadius: 8,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        background: active ? "#dcfce7" : "#fee2e2",
        color: active ? "#16a34a" : "#dc2626",
        borderRadius: 8,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ─── Table row type ─── */
interface ProductRow {
  id: string;
  name: string;
  type: string;
  category: string;
  supplier: string;
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
  supplier: p.supplier?.name ?? "None",
  variants: p.variants.length,
  minPrice: Math.min(...p.variants.map((v) => v.price.selling)),
  stock: p.variants.reduce((acc, v) => acc + v.quantity.inStock, 0),
  status: p.isActive,
  _raw: p,
});

/* ─── Columns ─── */
const columns: Column<ProductRow>[] = [
  {
    key: "name",
    label: "Product",
    sortable: true,
    render: (row) => (
      <div>
        <div style={{ fontWeight: 700, color: "#0d4f4a", fontSize: 14 }}>{row.name}</div>
        <div style={{ fontSize: 11, color: "#5eaaa0", marginTop: 2 }}>{row.category}</div>
      </div>
    ),
  },
  {
    key: "type",
    label: "Type",
    render: (row) => <TypeBadge type={row.type} />,
  },
  {
    key: "supplier",
    label: "Supplier",
  },
  {
    key: "variants",
    label: "Variants",
    align: "center",
    render: (row) => (
      <span
        style={{
          background: TEAL_LIGHT,
          color: TEAL_DARK,
          borderRadius: 8,
          padding: "3px 12px",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {row.variants}
      </span>
    ),
  },
  {
    key: "minPrice",
    label: "From (₹)",
    align: "center",
    sortable: true,
    render: (row) => (
      <span style={{ fontWeight: 700, color: "#0d4f4a", fontSize: 14 }}>
        ₹{row.minPrice.toFixed(2)}
      </span>
    ),
  },
  {
    key: "stock",
    label: "Stock",
    align: "center",
    sortable: true,
    render: (row) => (
      <span
        style={{
          color: row.stock < 10 ? "#dc2626" : row.stock < 30 ? "#ca8a04" : "#16a34a",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {row.stock}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    align: "center",
    render: (row) => <StatusBadge active={row.status} />,
  },
];

/* ─── Filter bar styles ─── */
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

/* ════════════════════════════════════════
   PRODUCTS PAGE
════════════════════════════════════════ */

// NOTE: Pass real category/supplier lists from parent or fetch inline.
// For a standalone page they can be fetched here.

interface ProductsPageProps {
  categories?: { _id: string; name: string }[];
  suppliers?: { _id: string; name: string }[];
}

export default function ProductsPage({
  categories = [],
  suppliers = [],
}: ProductsPageProps) {
  /* ── State ── */
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Server-side pagination / filter
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("true");
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const LIMIT = 8;

  /* ── Fetch ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetProductsParams = {
        page,
        limit: LIMIT,
        isActive: filterStatus === "" ? undefined : filterStatus === "true",
      };
      if (search.trim()) params.search = search.trim();
      if (filterType) params.type = filterType as any;
      if (filterCategory) params.category = filterCategory;

      const res = await getProducts(params);

      if (res.success) {
        setRows((res.data as Product[]).map(toRow));
        setTotalRecords(res.pagination?.total ?? (res.data as any[]).length);
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterCategory, filterStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ── Toast ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Actions ── */
  const handleCreate = async (
    payload: CreateProductPayload | UpdateProductPayload,
    imageFiles: File[][]
  ) => {
    setActionLoading(true);
    try {
      await createProduct(payload as CreateProductPayload, imageFiles);
      showToast("Product created successfully!");
      setCreateOpen(false);
      setPage(1);
      fetchProducts();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to create product", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (
    payload: CreateProductPayload | UpdateProductPayload,
    imageFiles: File[][]
  ) => {
    if (!editProduct) return;
    setActionLoading(true);
    try {
      await updateProduct(editProduct._id, payload as UpdateProductPayload, imageFiles);
      showToast("Product updated successfully!");
      setEditProduct(null);
      fetchProducts();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to update product", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteProduct(deleteTarget._id);
      showToast("Product deleted successfully!");
      setDeleteTarget(null);
      fetchProducts();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to delete product", "error");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Table actions ── */
  const tableActions: TableAction<ProductRow>[] = [
    {
      label: "View",
      icon: <EyeIcon />,
      onClick: (row) => setViewProduct(row._raw),
      color: "#5eaaa0",
      hoverColor: TEAL,
      hoverBg: TEAL_BG,
    },
    {
      label: "Edit",
      icon: <EditIcon />,
      onClick: (row) => setEditProduct(row._raw),
      color: "#5eaaa0",
      hoverColor: "#1d4ed8",
      hoverBg: "#eff6ff",
    },
    {
      label: "Delete",
      icon: <TrashIcon />,
      onClick: (row) => setDeleteTarget(row._raw),
      color: "#f87171",
      hoverColor: "#dc2626",
      hoverBg: "#fef2f2",
    },
  ];

  /* ── Header action ── */
  const headerAction: ReactNode = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        onClick={() => setShowFilters((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 14px",
          border: `1.5px solid ${showFilters ? TEAL : TEAL_LIGHT}`,
          borderRadius: 10,
          background: showFilters ? TEAL_BG : "#fff",
          color: showFilters ? TEAL_DARK : "#5eaaa0",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
        }}
      >
        <FilterIcon />
        Filters
      </button>
      <button
        onClick={fetchProducts}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 14px",
          border: `1.5px solid ${TEAL_LIGHT}`,
          borderRadius: 10,
          background: "#fff",
          color: "#5eaaa0",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
        }}
      >
        <RefreshIcon />
      </button>
      <button
        onClick={() => setCreateOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 16px",
          border: "none",
          borderRadius: 10,
          background: `linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`,
          color: "#fff",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          boxShadow: "0 2px 8px rgba(13,148,136,0.25)",
        }}
      >
        <PlusIcon />
        Add Product
      </button>
    </div>
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
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "success" ? "#f0fdfa" : "#fef2f2",
            border: `1.5px solid ${toast.type === "success" ? TEAL_LIGHT : "#fecaca"}`,
            color: toast.type === "success" ? TEAL_DARK : "#dc2626",
            padding: "12px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            maxWidth: 340,
          }}
        >
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 900,
            color: "#0d4f4a",
            letterSpacing: "-0.5px",
          }}
        >
          Products
        </h1>
        <p style={{ margin: "4px 0 0", color: "#5eaaa0", fontSize: 14 }}>
          Manage your product catalogue
        </p>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div
          style={{
            background: "#fff",
            border: `1.5px solid ${TEAL_LIGHT}`,
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 16,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL_DARK, marginBottom: 6, textTransform: "uppercase" }}>
              Type
            </label>
            <select
              style={filterInput}
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="food">Food</option>
              <option value="animal">Animal</option>
              <option value="accessory">Accessory</option>
              <option value="medicine">Medicine</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL_DARK, marginBottom: 6, textTransform: "uppercase" }}>
              Category
            </label>
            <select
              style={filterInput}
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL_DARK, marginBottom: 6, textTransform: "uppercase" }}>
              Status
            </label>
            <select
              style={filterInput}
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
          </div>
          <button
            onClick={() => { setFilterType(""); setFilterCategory(""); setFilterStatus("true"); setPage(1); }}
            style={{
              padding: "9px 14px",
              border: `1.5px solid ${TEAL_LIGHT}`,
              borderRadius: 10,
              background: "#fff",
              color: "#5eaaa0",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
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
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search products…"
        headerAction={headerAction}
        mobileVisibleKeys={["name", "type", "minPrice", "stock", "status"]}
      />

      {/* Modals */}
      <ProductFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        categories={categories}
        suppliers={suppliers}
        loading={actionLoading}
      />

      <ProductFormModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        onSubmit={handleEdit}
        initialData={editProduct}
        categories={categories}
        suppliers={suppliers}
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
    </div>
  );
}