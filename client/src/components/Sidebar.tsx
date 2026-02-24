import { useState, useEffect, type JSX } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: JSX.Element;
  badge?: number;
  section?: string;
}

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

/* ──────────────────────────────────────
   ICONS
────────────────────────────────────── */
const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const TagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const BoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const BarChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const PawIcon = () => (
  <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="42" rx="13" ry="10" fill="rgba(255,255,255,0.9)" />
    <ellipse cx="15" cy="28" rx="6.5" ry="8.5" fill="rgba(255,255,255,0.9)" />
    <ellipse cx="49" cy="28" rx="6.5" ry="8.5" fill="rgba(255,255,255,0.9)" />
    <ellipse cx="22" cy="18" rx="4.5" ry="6" fill="rgba(255,255,255,0.9)" />
    <ellipse cx="42" cy="18" rx="4.5" ry="6" fill="rgba(255,255,255,0.9)" />
  </svg>
);

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transition: "transform 0.3s", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

/* ──────────────────────────────────────
   NAV CONFIG
────────────────────────────────────── */
const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <GridIcon />, section: "MAIN" },
  { id: "categories", label: "Categories", icon: <TagIcon />, section: "CATALOGUE" },
  { id: "products", label: "Products", icon: <BoxIcon />, section: "CATALOGUE" },
  { id: "orders", label: "Orders", icon: <ShoppingBagIcon />, section: "CATALOGUE" },
  { id: "customers", label: "Customers", icon: <UsersIcon />, section: "PEOPLE" },
  { id: "analytics", label: "Analytics", icon: <BarChartIcon />, section: "PEOPLE" },
  { id: "settings", label: "Settings", icon: <SettingsIcon />, section: "SYSTEM" },
];

const sections = ["MAIN", "CATALOGUE", "PEOPLE", "SYSTEM"] as const;

/* ──────────────────────────────────────
   SIDEBAR
────────────────────────────────────── */
export default function Sidebar({
  activePage,
  onNavigate,
  userName = "Admin User",
  userRole = "Administrator",
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const WIDTH = collapsed ? 72 : 256;

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* ── Mobile Hamburger ── */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 1100,
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(15,118,110,0.4)",
          }}
        >
          <HamburgerIcon />
        </button>
      )}

      {/* ── Mobile Overlay ── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: WIDTH,
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: isMobile ? (mobileOpen ? 0 : -WIDTH - 10) : 0,
          zIndex: 1000,
          boxShadow: "4px 0 40px rgba(0,0,0,0.15)",
          overflow: "hidden",
          flexShrink: 0,
          height: "100vh",
        }}
      >
        {/* Decorative noise overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06) 0%, transparent 60%),
              radial-gradient(circle at 80% 80%, rgba(255,255,255,0.04) 0%, transparent 50%)`,
            pointerEvents: "none",
          }}
        />

        {/* Dot pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }}
        />

        {/* ── Logo / Brand ── */}
        <div
          style={{
            padding: collapsed ? "20px 0" : "20px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: collapsed ? "center" : "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {/* Logo mark */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backdropFilter: "blur(8px)",
              }}
            >
              <PawIcon />
            </div>

            {/* Brand text */}
            {!collapsed && (
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "-0.3px",
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                  }}
                >
                  Max Pets
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Admin Panel
                </div>
              </div>
            )}
          </div>

          {/* Collapse toggle — desktop only */}
          {!isMobile && (
            <button
              onClick={() => setCollapsed((p) => !p)}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.8)",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)")}
            >
              <CollapseIcon collapsed={collapsed} />
            </button>
          )}

          {/* Mobile close */}
          {isMobile && mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.8)",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav
          style={{
            flex: 1,
            padding: "12px 10px",
            overflowY: "auto",
            overflowX: "hidden",
            position: "relative",
            zIndex: 1,
            scrollbarWidth: "none",
          }}
        >
          {sections.map((section) => {
            const items = navItems.filter((n) => n.section === section);
            if (!items.length) return null;

            return (
              <div key={section} style={{ marginBottom: 6 }}>
                {/* Section label */}
                {!collapsed && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.35)",
                      letterSpacing: "1.2px",
                      textTransform: "uppercase",
                      padding: "10px 8px 6px",
                      fontFamily: "'DM Sans', sans-serif",
                      userSelect: "none",
                    }}
                  >
                    {section}
                  </div>
                )}

                {collapsed && section !== "MAIN" && (
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.1)",
                      margin: "8px 12px",
                    }}
                  />
                )}

                {items.map((item) => {
                  const isActive = activePage === item.id;
                  const isHovered = hoveredItem === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        if (isMobile) setMobileOpen(false);
                      }}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      title={collapsed ? item.label : undefined}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: collapsed ? "11px 0" : "10px 12px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        background: isActive
                          ? "rgba(255,255,255,0.18)"
                          : isHovered
                            ? "rgba(255,255,255,0.09)"
                            : "transparent",
                        border: "none",
                        borderRadius: 10,
                        cursor: "pointer",
                        color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                        marginBottom: 2,
                        transition: "all 0.18s ease",
                        position: "relative",
                        textAlign: "left",
                        boxShadow: isActive ? "0 2px 12px rgba(0,0,0,0.12)" : "none",
                        outline: "none",
                      }}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "20%",
                            height: "60%",
                            width: 3,
                            background: "#fff",
                            borderRadius: "0 3px 3px 0",
                          }}
                        />
                      )}

                      {/* Icon container */}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          background: isActive
                            ? "rgba(255,255,255,0.18)"
                            : isHovered
                              ? "rgba(255,255,255,0.1)"
                              : "transparent",
                          flexShrink: 0,
                          transition: "background 0.18s",
                        }}
                      >
                        {item.icon}
                      </span>

                      {/* Label + badge */}
                      {!collapsed && (
                        <>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: isActive ? 700 : 500,
                              fontFamily: "'DM Sans', sans-serif",
                              flex: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.label}
                          </span>

                          {item.badge != null && (
                            <span
                              style={{
                                background: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                                color: isActive ? "#0f766e" : "#fff",
                                borderRadius: 20,
                                padding: "1px 8px",
                                fontSize: 11,
                                fontWeight: 800,
                                flexShrink: 0,
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}

                          {isActive && !item.badge && (
                            <span style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
                              <ChevronRight />
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── User Profile ── */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            padding: collapsed ? "14px 0" : "14px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: collapsed ? "center" : "flex-start",
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.2)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.5px",
            }}
          >
            {initials}
          </div>

          {/* Name + role */}
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 11,
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userRole}
              </div>
            </div>
          )}

          {/* Logout button */}
          {!collapsed && (
            <button
              onClick={() => {/* hook up logout */ }}
              title="Logout"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.65)",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.18s",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "rgba(239,68,68,0.25)";
                b.style.color = "#fca5a5";
                b.style.borderColor = "rgba(239,68,68,0.3)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "rgba(255,255,255,0.1)";
                b.style.color = "rgba(255,255,255,0.65)";
                b.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}