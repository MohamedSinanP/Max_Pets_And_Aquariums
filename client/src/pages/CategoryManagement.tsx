import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DataTable, { type Column, type TableAction } from "../components/DataTable";

import {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  type Category,
  type CategoryType,
} from "../apis/category";

/* ================================================================
   Types
================================================================ */
type SortDir = "asc" | "desc";
type ModalMode = "create" | "edit";

interface ModalState {
  mode: ModalMode;
  data?: Category;
}

interface CategoryForm {
  name: string;
  parent: string | null;
  type: CategoryType;
  description?: string | null;
  isActive: boolean;
}

interface ModalProps {
  mode: ModalMode;
  initial?: Category;
  parentOptions: Category[];
  onClose: () => void;
  onSave: (data: CategoryForm) => void;
}

/* ================================================================
   Icons
================================================================ */
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

/* ================================================================
   Responsive helpers
================================================================ */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

/* ================================================================
   Modal (Responsive)
================================================================ */
function CategoryModal({ mode, initial, parentOptions, onClose, onSave }: ModalProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const initialParentId =
    initial?.parent && typeof initial.parent === "object"
      ? (initial.parent.id ?? null)
      : ((initial?.parent as any) ?? null);

  const [form, setForm] = useState<CategoryForm>({
    name: initial?.name ?? "",
    parent: initialParentId,
    type: initial?.type ?? "living",
    description: initial?.description ?? "",
    isActive: initial?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CategoryForm, string>>>({});

  const set = <K extends keyof CategoryForm>(key: K, val: CategoryForm[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Partial<Record<keyof CategoryForm, string>> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.type) e.type = "Type is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() ? form.description.trim() : null,
    });
  };

  const inputStyle = (hasError?: boolean) => ({
    width: "100%",
    padding: "10px 14px",
    border: `1.5px solid ${hasError ? "#f87171" : "#ccf0ec"}`,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: "#0d4f4a",
    background: hasError ? "#fff5f5" : "#f8fffe",
    outline: "none",
    boxSizing: "border-box" as const,
  });

  const labelStyle = {
    display: "block" as const,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 12,
    color: "#0d7a70",
    marginBottom: 6,
    letterSpacing: "0.3px",
    textTransform: "uppercase" as const,
  };

  const safeParentOptions = parentOptions.filter((c) => c.id !== initial?.id);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,60,55,0.5)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: isMobile ? 12 : 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 24px 80px rgba(15,118,110,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: isMobile ? "18px 16px" : "24px 28px",
            background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize: isMobile ? 18 : 20,
                lineHeight: 1.15,
              }}
            >
              {mode === "create" ? "Create Category" : "Edit Category"}
            </h2>
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
              {mode === "create" ? "Add a new category to your system" : "Update category information"}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              width: 38,
              height: 38,
              borderRadius: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: isMobile ? 16 : 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxHeight: isMobile ? "72vh" : "60vh",
            overflowY: "auto",
          }}
        >
          {/* Name + Icon (stack on mobile) */}
          <div style={{
            display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr"
          }}>
            < div >
              <label style={labelStyle}>Category Name *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Animals"
                style={inputStyle(!!errors.name)}
              />
              {errors.name && <p style={{ margin: "6px 0 0", color: "#f87171", fontSize: 12 }}>{errors.name}</p>}
            </div>
          </div>

          {/* Type + Parent (stack on mobile) */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Type *</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value as CategoryType)} style={{ ...inputStyle(!!errors.type), cursor: "pointer" }}>
                <option value="living">Living</option>
                <option value="non-living">Non-Living</option>
              </select>
              {errors.type && <p style={{ margin: "6px 0 0", color: "#f87171", fontSize: 12 }}>{errors.type}</p>}
            </div>

            <div>
              <label style={labelStyle}>Parent</label>
              <select value={form.parent ?? ""} onChange={(e) => set("parent", (e.target.value || null) as string | null)} style={{ ...inputStyle(false), cursor: "pointer" }}>
                <option value="">None (Root)</option>
                {safeParentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of this category..."
              rows={isMobile ? 3 : 4}
              style={{ ...inputStyle(false), resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "#f0fdfa",
              borderRadius: 14,
              border: "1.5px solid #ccf0ec",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0d4f4a" }}>Active Status</div>
              <div style={{ color: "#5eaaa0", fontSize: 12 }}>
                {form.isActive ? "Category is visible and active" : "Category is hidden from users"}
              </div>
            </div>

            <button
              onClick={() => set("isActive", !form.isActive)}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                background: form.isActive ? "#0d9488" : "#cbd5e1",
                border: "none",
                cursor: "pointer",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: form.isActive ? 26 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.25s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        </div>

        {/* Footer (stack on mobile) */}
        <div
          style={{
            padding: isMobile ? "14px 16px" : "18px 24px",
            borderTop: "1px solid #f0fafa",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            background: "#fafffe",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1.5px solid #ccf0ec",
              background: "#fff",
              color: "#5eaaa0",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              flex: isMobile ? "1 1 140px" : "0 0 auto",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #0f766e, #0d9488)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 14,
              boxShadow: "0 4px 14px rgba(15,118,110,0.35)",
              flex: isMobile ? "1 1 160px" : "0 0 auto",
            }}
          >
            {mode === "create" ? "Create Category" : "Save Changes"}
          </button>
        </div>
      </div >
    </div >
  );
}

/* ================================================================
   Page
================================================================ */
export default function CategoryManagement() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(8);
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<string | null>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modal, setModal] = useState<ModalState | null>(null);

  const apiSort = useMemo(() => {
    if (!sortKey) return "-createdAt";
    const prefix = sortDir === "desc" ? "-" : "";
    return `${prefix}${sortKey}`;
  }, [sortKey, sortDir]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getCategories({
        page,
        limit,
        search: search.trim() || undefined,
        sort: apiSort as any,
      });

      setCategories(res.data.results);
      setTotal(res.data.total);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, apiSort]);

  const refresh = async () => {
    await fetchList();
  };

  const handleSave = async (data: CategoryForm) => {
    try {
      if (modal?.mode === "create") {
        const res = await createCategory({
          name: data.name,
          type: data.type,
          parent: data.parent,
          description: data.description,
        });

        toast.success(res.message || "Category created");
        setModal(null);
        setPage(1);
        await refresh();
        return;
      }

      if (modal?.mode === "edit" && modal.data) {
        const res = await updateCategory(modal.data.id, {
          name: data.name,
          type: data.type,
          parent: data.parent,
          description: data.description,
          isActive: data.isActive,
        });

        toast.success(res.message || "Category updated");
        setModal(null);
        await refresh();
        return;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Save failed");
    }
  };

  const handleToggle = async (row: Category) => {
    try {
      const res = await toggleCategoryActive(row.id);
      toast.success(res.message || "Status updated");
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to toggle status");
    }
  };

  // Stats (page stats)
  const stats = useMemo(() => {
    const active = categories.filter((c) => c.isActive).length;
    const living = categories.filter((c) => c.type === "living").length;
    const roots = categories.filter((c) => !c.parent).length;
    return { active, living, roots };
  }, [categories]);

  const columns: Column<Category>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: "#0d4f4a", fontSize: 14, lineHeight: 1.2, wordBreak: "break-word" }}>
            {row.name}
          </div>
          <div style={{ color: "#79cfc7", fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.slug}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (row) => (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            background: row.type === "living" ? "#dcfce7" : "#dbeafe",
            color: row.type === "living" ? "#15803d" : "#1d4ed8",
            border: `1px solid ${row.type === "living" ? "#bbf7d0" : "#bfdbfe"}`,
            whiteSpace: "nowrap",
          }}
        >
          {row.type === "living" ? "🌱 Living" : "⚙️ Non-Living"}
        </span>
      ),
    },
    {
      key: "parent",
      label: "Parent",
      sortable: false,
      render: (row) => {
        const parentName = row.parent && typeof row.parent === "object" ? row.parent.name : null;
        return (
          <span style={{ color: parentName ? "#0d9488" : "#9ca3af", fontSize: 13, whiteSpace: "nowrap" }}>
            {parentName ? `↳ ${parentName}` : "Root"}
          </span>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      align: "center",
      render: (row) => (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            background: row.isActive ? "#f0fdfa" : "#f9fafb",
            color: row.isActive ? "#0f766e" : "#6b7280",
            border: `1px solid ${row.isActive ? "#99f6e4" : "#e5e7eb"}`,
            whiteSpace: "nowrap",
          }}
        >
          {row.isActive ? "● Active" : "○ Inactive"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (row) => (
        <span style={{ color: "#9eaeb0", fontSize: 12, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
          {new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
  ];

  const actions: TableAction<Category>[] = [
    {
      label: "Edit",
      icon: <EditIcon />,
      onClick: (row) => setModal({ mode: "edit", data: row }),
      color: "#0d9488",
      hoverColor: "#0f766e",
      hoverBg: "#f0fdfa",
    }
  ];

  const statCards = [
    { label: "Total (server)", value: total, icon: "◈", color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
    { label: "Active (page)", value: stats.active, icon: "●", color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Living (page)", value: stats.living, icon: "🌱", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
    { label: "Roots (page)", value: stats.roots, icon: "⬡", color: "#0891b2", bg: "#f0f9ff", border: "#bae6fd" },
  ];

  return (
    <div
      style={{
        flex: 1,
        background: "#f7fffe",
        minHeight: "100%",
        padding: isMobile ? "84px 12px 16px" : "24px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#f0fdfa; }
        ::-webkit-scrollbar-thumb { background:#0d9488; border-radius:3px; }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg, #0f766e, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(15,118,110,0.3)",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>

            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? 20 : 26, color: "#0d3d38", letterSpacing: "-0.6px" }}>
                Category Management
              </h1>
              <p style={{ margin: "2px 0 0", color: "#5eaaa0", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                Server pagination • search • sort
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            width: isMobile ? "100%" : "auto",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => void refresh()}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1.5px solid #ccf0ec",
              background: "#fff",
              color: "#0f766e",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
              flex: isMobile ? "1 1 140px" : "0 0 auto",
            }}
          >
            Refresh
          </button>

          <button
            onClick={() => setModal({ mode: "create" })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 14px",
              background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 13,
              boxShadow: "0 4px 18px rgba(15,118,110,0.35)",
              flex: isMobile ? "1 1 160px" : "0 0 auto",
              whiteSpace: "nowrap",
            }}
          >
            <PlusIcon />
            New Category
          </button>
        </div>
      </div>

      {/* Stats (Responsive grid) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* On large screens go 4 columns */}
        <style>{`
          @media (min-width: 1024px) {
            .cat-stats-grid { grid-template-columns: repeat(4, 1fr) !important; }
          }
        `}</style>

        <div className="cat-stats-grid" style={{ display: "contents" as any }}>
          {statCards.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "16px 16px",
                border: `1px solid ${stat.border}`,
                boxShadow: `0 2px 12px rgba(15,118,110,0.06)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: stat.bg,
                  border: `1.5px solid ${stat.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {stat.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, letterSpacing: "-0.8px", lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ color: "#9eaeb0", fontSize: 12, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      Table
      <DataTable<Category>
        columns={columns}
        data={categories}
        actions={actions}
        title="All Categories"
        searchPlaceholder="Search categories..."
        emptyMessage="No categories found. Create your first one!"
        rowsPerPage={limit}
        loading={loading}
        serverSide
        totalRecords={total}
        page={page}
        onPageChange={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
          setPage(1);
        }}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
      />

      {/* Modal */}
      {modal && (
        <CategoryModal
          mode={modal.mode}
          initial={modal.data}
          parentOptions={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}