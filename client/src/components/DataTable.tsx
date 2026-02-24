import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
}

export interface TableAction<T> {
  label: string;
  icon: ReactNode;
  onClick: (row: T) => void;
  color?: string;
  hoverColor?: string;
  hoverBg?: string;
}

type SortDir = "asc" | "desc";

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  actions?: TableAction<T>[];

  searchable?: boolean;
  searchPlaceholder?: string;

  onSearch?: (query: string) => void;

  loading?: boolean;
  emptyMessage?: string;

  title?: string;
  headerAction?: ReactNode;

  rowsPerPage?: number;

  serverSide?: boolean;
  totalRecords?: number;

  page?: number;
  onPageChange?: (page: number) => void;

  sortKey?: string | null;
  sortDir?: SortDir;
  onSortChange?: (key: string, dir: SortDir) => void;

  searchDebounceMs?: number;

  /**
   * ✅ Optional: choose which columns to show in mobile cards
   * If not provided, it will show ALL columns.
   */
  mobileVisibleKeys?: (keyof T | string)[];
}

const ChevronUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const SearchIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

function getValue<T>(row: T, key: keyof T | string): unknown {
  return (row as Record<string, unknown>)[key as string];
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  actions,

  searchable = true,
  searchPlaceholder = "Search...",
  onSearch,

  loading = false,
  emptyMessage = "No data found.",
  title,
  headerAction,
  rowsPerPage = 8,

  serverSide = false,
  totalRecords,

  page: controlledPage,
  onPageChange,

  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,

  searchDebounceMs = 350,

  mobileVisibleKeys,
}: DataTableProps<T>) {
  // Local states (used when serverSide=false)
  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortDir, setLocalSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState<string>("");
  const [localPage, setLocalPage] = useState<number>(1);

  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const isMobile = useMediaQuery("(max-width: 640px)");

  const activePage = serverSide ? (controlledPage ?? 1) : localPage;
  const activeSortKey = serverSide ? (controlledSortKey ?? null) : localSortKey;
  const activeSortDir = serverSide ? (controlledSortDir ?? "asc") : localSortDir;

  // Debounce search callback for server-side
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!serverSide) return;
    if (!onSearch) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onSearch(search);
    }, searchDebounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [search, onSearch, serverSide, searchDebounceMs]);

  const handleSort = (key: string) => {
    const nextDir: SortDir = activeSortKey === key ? (activeSortDir === "asc" ? "desc" : "asc") : "asc";

    if (serverSide) {
      onSortChange?.(key, nextDir);
      onPageChange?.(1);
      return;
    }

    if (localSortKey === key) {
      setLocalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setLocalSortKey(key);
      setLocalSortDir("asc");
    }
    setLocalPage(1);
  };

  // --------------------------
  // Client-side pipeline
  // --------------------------
  const clientFiltered = useMemo(() => {
    if (serverSide) return data;

    const q = search.toLowerCase();
    if (!q) return data;

    return data.filter((row) =>
      columns.some((col) => {
        const val = getValue(row, col.key);
        return String(val ?? "").toLowerCase().includes(q);
      })
    );
  }, [data, columns, search, serverSide]);

  const clientSorted = useMemo(() => {
    if (serverSide) return clientFiltered;
    if (!localSortKey) return clientFiltered;

    const key = localSortKey;
    const dir = localSortDir;

    return [...clientFiltered].sort((a, b) => {
      const av = getValue(a, key) as string;
      const bv = getValue(b, key) as string;
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [clientFiltered, localSortKey, localSortDir, serverSide]);

  const clientTotalPages = useMemo(() => {
    if (serverSide) return 1;
    return Math.max(1, Math.ceil(clientSorted.length / rowsPerPage));
  }, [clientSorted.length, rowsPerPage, serverSide]);

  const clientPaginated = useMemo(() => {
    if (serverSide) return clientSorted;
    const start = (localPage - 1) * rowsPerPage;
    return clientSorted.slice(start, start + rowsPerPage);
  }, [clientSorted, localPage, rowsPerPage, serverSide]);

  // --------------------------
  // Server-side pagination info
  // --------------------------
  const serverTotal = totalRecords ?? data.length;
  const serverTotalPages = Math.max(1, Math.ceil(serverTotal / rowsPerPage));

  const totalPages = serverSide ? serverTotalPages : clientTotalPages;
  const paginated = serverSide ? data : clientPaginated;

  const recordsCountForHeader = serverSide ? serverTotal : clientSorted.length;

  const gotoPage = (p: number) => {
    if (serverSide) onPageChange?.(p);
    else setLocalPage(p);
  };

  const showingFrom = (activePage - 1) * rowsPerPage + 1;
  const showingTo = serverSide
    ? Math.min(activePage * rowsPerPage, serverTotal)
    : Math.min(activePage * rowsPerPage, clientSorted.length);

  // --------------------------
  // Mobile card helpers
  // --------------------------
  const mobileCols = useMemo(() => {
    if (!isMobile) return columns;
    if (!mobileVisibleKeys || mobileVisibleKeys.length === 0) return columns;
    const allow = new Set(mobileVisibleKeys.map(String));
    return columns.filter((c) => allow.has(String(c.key)));
  }, [columns, isMobile, mobileVisibleKeys]);

  const primaryCol = mobileCols[0] ?? columns[0];
  const secondaryCols = mobileCols.slice(1);

  const renderCell = (col: Column<T>, row: T) => {
    const val = col.render ? col.render(row) : String(getValue(row, col.key) ?? "—");
    return val;
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e2f5f3",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(15,118,110,0.08), 0 1px 4px rgba(15,118,110,0.05)",
      }}
    >
      {/* Header */}
      {(title || searchable || headerAction) && (
        <div
          style={{
            padding: isMobile ? "14px 14px" : "18px 24px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            gap: 12,
            borderBottom: "1px solid #f0fafa",
            background: "linear-gradient(135deg, #f0fdfa 0%, #fff 100%)",
          }}
        >
          {title && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: isMobile ? 15 : 16,
                  color: "#0f4f4a",
                  letterSpacing: "-0.3px",
                }}
              >
                {title}
              </h3>
              <p style={{ margin: "2px 0 0", color: "#5eaaa0", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                {recordsCountForHeader} total records
              </p>
            </div>
          )}

          {searchable && (
            <div style={{ position: "relative", width: isMobile ? "100%" : "auto" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ed8d4", pointerEvents: "none" }}>
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (serverSide) onPageChange?.(1);
                  else setLocalPage(1);
                }}
                placeholder={searchPlaceholder}
                style={{
                  padding: "9px 14px 9px 36px",
                  border: "1.5px solid #ccf0ec",
                  borderRadius: 10,
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#0d4f4a",
                  background: "#f8fffe",
                  outline: "none",
                  width: isMobile ? "100%" : 220,
                  maxWidth: "100%",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
                onBlur={(e) => (e.target.style.borderColor = "#ccf0ec")}
              />
            </div>
          )}

          {headerAction && <div style={{ width: isMobile ? "100%" : "auto" }}>{headerAction}</div>}
        </div>
      )}

      {/* CONTENT */}
      {isMobile ? (
        // --------------------------
        // MOBILE CARD VIEW
        // --------------------------
        <div style={{ padding: 12 }}>
          {loading ? (
            <div style={{ display: "grid", gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e2f5f3",
                    borderRadius: 14,
                    padding: 12,
                    background: "linear-gradient(135deg, #f0fdfa, #ffffff)",
                  }}
                >
                  <div style={{ height: 14, borderRadius: 7, background: "#e6faf7", width: "55%", marginBottom: 10 }} />
                  <div style={{ height: 12, borderRadius: 7, background: "#eefcf9", width: "85%", marginBottom: 8 }} />
                  <div style={{ height: 12, borderRadius: 7, background: "#eefcf9", width: "70%" }} />
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: "48px 12px", textAlign: "center", color: "#5eaaa0", fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
              {emptyMessage}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {paginated.map((row) => (
                <div
                  key={row.id}
                  style={{
                    border: "1px solid #e2f5f3",
                    borderRadius: 16,
                    padding: 12,
                    background: "linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)",
                    boxShadow: "0 2px 12px rgba(15,118,110,0.06)",
                  }}
                >
                  {/* Top line (primary column) */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: 14, color: "#0d4f4a", lineHeight: 1.25 }}>
                        {primaryCol ? renderCell(primaryCol, row) : String(row.id)}
                      </div>
                      <div style={{ color: "#9ed8d4", fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                        ID: {row.id}
                      </div>
                    </div>

                    {/* Actions (show ALL buttons in card view) */}
                    {actions && actions.length > 0 && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {actions.map((action, ai) => {
                          const key = `${row.id}-card-${ai}`;
                          const isActHovered = hoveredAction === key;

                          // ✅ Special case: if action label is Toggle/Deactivate/etc, show Activate/Deactivate based on row.isActive
                          const actionLabel =
                            String(action.label).toLowerCase() === "toggle"
                              ? ((row as any).isActive ? "Deactivate" : "Activate")
                              : String(action.label).toLowerCase() === "deactivate" || String(action.label).toLowerCase() === "activate"
                                ? ((row as any).isActive ? "Deactivate" : "Activate")
                                : action.label;

                          return (
                            <button
                              key={ai}
                              onClick={() => action.onClick(row)}
                              onMouseEnter={() => setHoveredAction(key)}
                              onMouseLeave={() => setHoveredAction(null)}
                              style={{
                                background: isActHovered ? (action.hoverBg ?? "#f0fdfa") : "#fff",
                                border: `1.5px solid ${isActHovered ? (action.hoverColor ?? "#0d9488") : "#e2f5f3"
                                  }`,
                                color: isActHovered ? (action.hoverColor ?? "#0d9488") : (action.color ?? "#5eaaa0"),
                                padding: "8px 10px",
                                borderRadius: 12,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                fontFamily: "'DM Sans', sans-serif",
                                fontWeight: 800,
                                transition: "all 0.2s",
                              }}
                            >
                              {action.icon}
                              <span>{actionLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  {secondaryCols.length > 0 && (
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {secondaryCols.map((col) => (
                        <div key={String(col.key)} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div
                            style={{
                              width: 92,
                              flexShrink: 0,
                              color: "#0d7a70",
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: "0.3px",
                              textTransform: "uppercase",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {col.label}
                          </div>
                          <div style={{ minWidth: 0, color: "#1a3d3a", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                            {renderCell(col, row)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions (show ALL buttons in card view) */}
                  {actions && actions.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {actions.map((action, ai) => {
                        const key = `${row.id}-card-${ai}`;
                        const isActHovered = hoveredAction === key;

                        // ✅ Special case: if action label is Toggle/Deactivate/etc, show Activate/Deactivate based on row.isActive
                        const actionLabel =
                          String(action.label).toLowerCase() === "toggle"
                            ? ((row as any).isActive ? "Deactivate" : "Activate")
                            : String(action.label).toLowerCase() === "deactivate" || String(action.label).toLowerCase() === "activate"
                              ? ((row as any).isActive ? "Deactivate" : "Activate")
                              : action.label;

                        return (
                          <button
                            key={ai}
                            onClick={() => action.onClick(row)}
                            onMouseEnter={() => setHoveredAction(key)}
                            onMouseLeave={() => setHoveredAction(null)}
                            style={{
                              background: isActHovered ? (action.hoverBg ?? "#f0fdfa") : "#fff",
                              border: `1.5px solid ${isActHovered ? (action.hoverColor ?? "#0d9488") : "#e2f5f3"
                                }`,
                              color: isActHovered ? (action.hoverColor ?? "#0d9488") : (action.color ?? "#5eaaa0"),
                              padding: "8px 10px",
                              borderRadius: 12,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              fontFamily: "'DM Sans', sans-serif",
                              fontWeight: 800,
                              transition: "all 0.2s",
                            }}
                          >
                            {action.icon}
                            <span>{actionLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // --------------------------
        // DESKTOP TABLE VIEW
        // --------------------------
        <div
          style={{
            overflowX: "auto",
            width: "100%",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 900,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ background: "linear-gradient(90deg, #f0fdfa, #f7fffe)" }}>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    onClick={() => col.sortable !== false && handleSort(String(col.key))}
                    style={{
                      padding: "12px 20px",
                      textAlign: col.align ?? "left",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#0d7a70",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      width: col.width,
                      cursor: col.sortable !== false ? "pointer" : "default",
                      userSelect: "none",
                      borderBottom: "2px solid #d0f5f0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        justifyContent: col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start",
                      }}
                    >
                      {col.label}
                      {col.sortable !== false && (
                        <span style={{ display: "flex", flexDirection: "column", color: activeSortKey === String(col.key) ? "#0d9488" : "#aad8d3" }}>
                          <span style={{ opacity: activeSortKey === String(col.key) && activeSortDir === "asc" ? 1 : 0.4 }}>
                            <ChevronUp />
                          </span>
                          <span style={{ opacity: activeSortKey === String(col.key) && activeSortDir === "desc" ? 1 : 0.4, marginTop: -4 }}>
                            <ChevronDown />
                          </span>
                        </span>
                      )}
                    </span>
                  </th>
                ))}

                {actions && actions.length > 0 && (
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "center",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#0d7a70",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      borderBottom: "2px solid #d0f5f0",
                    }}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={String(col.key)} style={{ padding: "16px 20px" }}>
                        <div
                          style={{
                            height: 14,
                            borderRadius: 7,
                            background: `linear-gradient(90deg, #f0fafa ${i * 10}%, #e0f7f5 ${i * 10 + 30}%, #f0fafa ${i * 10 + 60}%)`,
                            backgroundSize: "200% 100%",
                            animation: "shimmer 1.5s infinite",
                            width: `${60 + Math.random() * 30}%`,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ color: "#5eaaa0", fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{
                      background: idx % 2 === 0 ? "#fff" : "#fafffe",
                      transition: "background 0.15s",
                      borderBottom: "1px solid #f0fafa",
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        style={{
                          padding: "14px 20px",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 14,
                          color: "#1a3d3a",
                          textAlign: col.align ?? "left",
                          verticalAlign: "middle",
                        }}
                      >
                        {col.render ? col.render(row) : String(getValue(row, col.key) ?? "—")}
                      </td>
                    ))}

                    {actions && actions.length > 0 && (
                      <td style={{ padding: "14px 20px", textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                          {actions.map((action, ai) => {
                            const key = `${row.id}-${ai}`;
                            const isActHovered = hoveredAction === key;

                            return (
                              <button
                                key={ai}
                                onClick={() => action.onClick(row)}
                                onMouseEnter={() => setHoveredAction(key)}
                                onMouseLeave={() => setHoveredAction(null)}
                                title={action.label}
                                style={{
                                  background: isActHovered ? (action.hoverBg ?? "#f0fdfa") : "transparent",
                                  border: `1.5px solid ${isActHovered ? (action.hoverColor ?? "#0d9488") : "#e2f5f3"}`,
                                  color: isActHovered ? (action.hoverColor ?? "#0d9488") : (action.color ?? "#5eaaa0"),
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 12,
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontWeight: 500,
                                  transition: "all 0.2s",
                                }}
                              >
                                {action.icon}
                                <span>{action.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination (shared) */}
      {totalPages > 1 && (
        <div
          style={{
            padding: isMobile ? "12px 14px" : "14px 24px",
            display: "flex",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            borderTop: "1px solid #f0fafa",
            background: "linear-gradient(135deg, #f0fdfa 0%, #fff 100%)",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 10 : 0,
          }}
        >
          <span style={{ color: "#5eaaa0", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            Showing {showingFrom}–{showingTo} of {serverSide ? serverTotal : recordsCountForHeader}
          </span>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => gotoPage(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1.5px solid #ccf0ec",
                background: activePage === 1 ? "#f8fffe" : "#fff",
                color: activePage === 1 ? "#b0d8d4" : "#0d9488",
                cursor: activePage === 1 ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - activePage) <= 1)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={i} style={{ padding: "8px 6px", color: "#5eaaa0", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                    …
                  </span>
                ) : (
                  <button
                    key={i}
                    onClick={() => gotoPage(p as number)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: activePage === p ? "1.5px solid #0d9488" : "1.5px solid #ccf0ec",
                      background: activePage === p ? "#0d9488" : "#fff",
                      color: activePage === p ? "#fff" : "#0d9488",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => gotoPage(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1.5px solid #ccf0ec",
                background: activePage === totalPages ? "#f8fffe" : "#fff",
                color: activePage === totalPages ? "#b0d8d4" : "#0d9488",
                cursor: activePage === totalPages ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}