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
import { getCategories } from "../apis/category";

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

/* ─── Type / status badges ─── */
type ProductType = "animal" | "food" | "accessory" | "medicine" | "other";

const typeCls: Record<ProductType, string> = {
  food: "bg-green-100 text-green-700",
  animal: "bg-blue-100 text-blue-700",
  accessory: "bg-yellow-100 text-yellow-700",
  medicine: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

function TypeBadge({ type }: { type: string }) {
  const cls = typeCls[type as ProductType] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`${cls} rounded-lg px-2.5 py-0.5 text-xs font-bold whitespace-nowrap`}>
      {type}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
        }`}
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
        <div className="font-bold text-teal-900 text-sm">{row.name}</div>
        <div className="text-[11px] text-teal-400 mt-0.5">{row.category}</div>
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
      <span className="bg-teal-100 text-teal-700 rounded-lg px-3 py-0.5 font-bold text-sm">
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
      <span className="font-bold text-teal-900 text-sm">
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
        className={`font-bold text-sm ${row.stock < 10
            ? "text-red-600"
            : row.stock < 30
              ? "text-yellow-600"
              : "text-green-600"
          }`}
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

/* ════════════════════════════════════════
   PRODUCTS PAGE
════════════════════════════════════════ */

export default function ProductsPage() {
  /* ── State ── */
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("true");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

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

  const fetchMetaData = useCallback(async () => {
    try {
      const [catRes] = await Promise.all([getCategories({ limit: 100 })]);
      setCategories(
        catRes.data.results.map((c: any) => ({ _id: c._id, name: c.name }))
      );
    } catch (err) {
      console.error("Failed to fetch categories");
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchMetaData(); }, [fetchMetaData]);

  /* ── Toast ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── CRUD handlers ── */
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
      hoverColor: "#0d9488",
      hoverBg: "#f0fdfa",
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
    <div className="flex gap-2 items-center flex-wrap">
      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters((p) => !p)}
        className={`flex items-center gap-1.5 px-3.5 py-2 border-[1.5px] rounded-xl cursor-pointer text-sm font-bold transition-colors ${showFilters
            ? "border-teal-500 bg-teal-50 text-teal-700"
            : "border-teal-100 bg-white text-teal-400 hover:bg-teal-50"
          }`}
      >
        <FilterIcon />
        Filters
      </button>

      {/* Refresh */}
      <button
        onClick={fetchProducts}
        className="flex items-center gap-1.5 px-3.5 py-2 border-[1.5px] border-teal-100 rounded-xl bg-white text-teal-400 cursor-pointer text-sm font-bold hover:bg-teal-50 transition-colors"
      >
        <RefreshIcon />
      </button>

      {/* Add Product */}
      <button
        onClick={() => setCreateOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 border-none rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 text-white cursor-pointer text-sm font-bold shadow-[0_2px_8px_rgba(13,148,136,0.25)] hover:from-teal-800 hover:to-teal-600 transition-all"
      >
        <PlusIcon />
        Add Product
      </button>
    </div>
  );

  /* ── Filter select shared class ── */
  const filterSelectCls =
    "px-3.5 py-2 border-[1.5px] border-teal-100 rounded-xl text-sm text-teal-900 bg-white outline-none focus:border-teal-400 cursor-pointer transition-all font-[inherit]";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white p-6 box-border">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-xl text-sm font-bold shadow-[0_4px_24px_rgba(0,0,0,0.1)] flex items-center gap-2 max-w-[340px] border-[1.5px] ${toast.type === "success"
              ? "bg-teal-50 border-teal-100 text-teal-700"
              : "bg-red-50 border-red-200 text-red-600"
            }`}
        >
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-5">
        <h1 className="m-0 text-2xl font-black text-teal-900 tracking-tight">
          Products
        </h1>
        <p className="m-0 mt-1 text-teal-400 text-sm">
          Manage your product catalogue
        </p>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="bg-white border-[1.5px] border-teal-100 rounded-2xl px-5 py-4 mb-4 flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-[11px] font-bold text-teal-700 mb-1.5 uppercase tracking-wide">
              Type
            </label>
            <select
              className={filterSelectCls}
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
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
            <label className="block text-[11px] font-bold text-teal-700 mb-1.5 uppercase tracking-wide">
              Category
            </label>
            <select
              className={filterSelectCls}
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-teal-700 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <select
              className={filterSelectCls}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
          </div>

          <button
            onClick={() => {
              setFilterType("");
              setFilterCategory("");
              setFilterStatus("true");
              setPage(1);
            }}
            className="px-3.5 py-2 border-[1.5px] border-teal-100 rounded-xl bg-white text-teal-400 cursor-pointer text-sm font-bold hover:bg-teal-50 transition-colors"
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
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
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
    </div>
  );
}