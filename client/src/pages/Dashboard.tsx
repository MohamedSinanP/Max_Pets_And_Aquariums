/**
 * Dashboard.tsx
 *
 * Pet Management Admin Dashboard
 * Row 1 : Stats cards — Today Revenue, Month Revenue, Total Revenue,
 *          Total Profit, Orders Today, Low Stock Alert
 * Row 2 : Revenue line chart (with date range filter) + Order Status donut
 * Row 3 : Recent Orders table + Top Products bar chart
 * Row 4 : Low Stock table + Payment Status summary
 *
 * Teal + white color scheme · DM Sans + DM Mono · Tailwind CSS
 * All data from real API via dashboard.api.ts
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  getDashboardStats,
  getRevenueChart,
  getOrderStatus,
  getRecentOrders,
  getTopProducts,
  getLowStock,
  getPaymentSummary,
  type DashboardStats,
  type RevenueChartPoint,
  type OrderStatusData,
  type RecentOrder,
  type TopProduct,
  type LowStockItem,
  type PaymentSummaryData,
} from "../apis/dashboard";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

const fmt = (n: number): string => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const fmtFull = (n: number): string =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const today = (): string => new Date().toISOString().split("T")[0];
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

/* ─────────────────────────────────────────────────────────────
   SHARED ATOMS
───────────────────────────────────────────────────────────── */

const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="#ccf5f0" strokeWidth="3" />
    <path d="M12 2 A10 10 0 0 1 22 12" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const CardShell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = "",
}) => (
  <div className={`bg-white rounded-2xl border border-teal-100 shadow-sm shadow-teal-50 overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{
  title: string; subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between px-5 py-4 border-b border-teal-50 bg-gradient-to-r from-teal-50/60 to-white">
    <div>
      <h3 className="font-black text-teal-900 text-sm tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {title}
      </h3>
      {subtitle && (
        <p className="text-teal-400 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </div>
);

const LoadBox: React.FC<{ h?: string }> = ({ h = "h-48" }) => (
  <div className={`${h} flex items-center justify-center`}>
    <Spinner size={24} />
  </div>
);

interface OrderBadgeProps { status: string; type?: "order" | "payment"; }
const STATUS_ORDER: Record<string, { bg: string; color: string; dot: string }> = {
  pending: { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  confirmed: { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  ready: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  delivered: { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};
const STATUS_PAY: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e" },
  paid: { bg: "#d1fae5", color: "#065f46" },
  partial: { bg: "#e0f2fe", color: "#075985" },
  refunded: { bg: "#fce7f3", color: "#9d174d" },
};

const StatusBadge: React.FC<OrderBadgeProps> = ({ status, type = "order" }) => {
  const cfg = type === "order" ? STATUS_ORDER[status] : STATUS_PAY[status];
  if (!cfg) return <span className="text-teal-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold capitalize"
      style={{ background: cfg.bg, color: cfg.color }}>
      {type === "order" && "dot" in cfg && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: (cfg as any).dot }} />
      )}
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────
   ROW 1 — STAT CARDS (6 cards)
───────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  change?: number;       // % change, undefined = no badge
  icon: React.ReactNode;
  accent: string;        // teal, amber, green, purple…
  loading?: boolean;
}

const ACCENT: Record<string, { bg: string; border: string; iconBg: string; val: string; badge: string; badgeText: string }> = {
  teal: { bg: "#f0fdfa", border: "#99f6e4", iconBg: "#ccfbf1", val: "#0f766e", badge: "", badgeText: "" },
  amber: { bg: "#fffbeb", border: "#fde68a", iconBg: "#fef3c7", val: "#b45309", badge: "", badgeText: "" },
  green: { bg: "#f0fdf4", border: "#bbf7d0", iconBg: "#dcfce7", val: "#15803d", badge: "", badgeText: "" },
  purple: { bg: "#faf5ff", border: "#e9d5ff", iconBg: "#f3e8ff", val: "#7c3aed", badge: "", badgeText: "" },
  blue: { bg: "#eff6ff", border: "#bfdbfe", iconBg: "#dbeafe", val: "#1d4ed8", badge: "", badgeText: "" },
  red: { bg: "#fff1f2", border: "#fecdd3", iconBg: "#ffe4e6", val: "#be123c", badge: "", badgeText: "" },
};

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, change, icon, accent, loading }) => {
  const a = ACCENT[accent] ?? ACCENT.teal;
  return (
    <div className="rounded-2xl border p-5 relative overflow-hidden"
      style={{ background: a.bg, borderColor: a.border }}>
      {/* Glow circle */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-30"
        style={{ background: a.iconBg }} />
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: a.iconBg }}>
          {icon}
        </div>
        {change !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${change >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
            style={{ fontFamily: "'DM Mono', monospace" }}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 flex items-center"><Spinner size={18} /></div>
      ) : (
        <p className="text-2xl font-black leading-none relative z-10"
          style={{ color: a.val, fontFamily: "'DM Mono', monospace" }}>
          {value}
        </p>
      )}
      <p className="text-xs font-semibold text-teal-500 mt-1.5 relative z-10"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </p>
      {sub && (
        <p className="text-xs text-teal-400 mt-0.5 relative z-10"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {sub}
        </p>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ROW 2 LEFT — REVENUE LINE CHART (pure SVG, no lib needed)
───────────────────────────────────────────────────────────── */

const PRESETS = [
  { label: "7D", from: daysAgo(6), to: today() },
  { label: "14D", from: daysAgo(13), to: today() },
  { label: "30D", from: daysAgo(29), to: today() },
  { label: "90D", from: daysAgo(89), to: today() },
];

interface RevenueChartProps {
  data: RevenueChartPoint[];
  loading: boolean;
  onRangeChange: (from: string, to: string) => void;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading, onRangeChange }) => {
  const [preset, setPreset] = useState("30D");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (label: string, from: string, to: string) => {
    setPreset(label);
    setShowCustom(false);
    onRangeChange(from, to);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      setPreset("Custom");
      setShowCustom(false);
      onRangeChange(customFrom, customTo);
    }
  };

  // SVG chart math
  const W = 600, H = 160, PAD = { top: 12, right: 12, bottom: 28, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxRev = Math.max(...data.map(d => d.revenue), 1);
  const minRev = 0;

  const x = (i: number) =>
    PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const y = (v: number) =>
    PAD.top + innerH - ((v - minRev) / (maxRev - minRev || 1)) * innerH;

  const points = data.map((d, i) => `${x(i)},${y(d.revenue)}`).join(" ");
  const areaPoints = data.length
    ? `${x(0)},${H - PAD.bottom} ${points} ${x(data.length - 1)},${H - PAD.bottom}`
    : "";

  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) =>
    minRev + ((maxRev - minRev) / ySteps) * i
  );

  // X-axis: show every Nth label
  const xStep = Math.max(1, Math.ceil(data.length / 7));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);

  return (
    <CardShell>
      <CardHeader
        title="Revenue Trend"
        subtitle="Daily revenue over selected period"
        action={
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => handlePreset(p.label, p.from, p.to)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${preset === p.label ? "bg-teal-600 text-white" : "border border-teal-100 text-teal-500 hover:border-teal-300"}`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setShowCustom(v => !v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${showCustom || preset === "Custom" ? "bg-teal-600 text-white border-teal-600" : "border-teal-100 text-teal-500 hover:border-teal-300"}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {preset === "Custom" ? "Custom ✓" : "Custom"}
            </button>
          </div>
        }
      />
      {showCustom && (
        <div className="flex items-center gap-2 px-5 py-3 bg-teal-50/50 border-b border-teal-50 flex-wrap">
          <input type="date" value={customFrom} max={customTo || today()}
            onChange={e => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 text-xs border-2 border-teal-100 rounded-lg text-teal-800 focus:outline-none focus:border-teal-400"
            style={{ fontFamily: "'DM Mono', monospace" }}
          />
          <span className="text-teal-400 text-xs">to</span>
          <input type="date" value={customTo} min={customFrom} max={today()}
            onChange={e => setCustomTo(e.target.value)}
            className="px-3 py-1.5 text-xs border-2 border-teal-100 rounded-lg text-teal-800 focus:outline-none focus:border-teal-400"
            style={{ fontFamily: "'DM Mono', monospace" }}
          />
          <button onClick={handleCustomApply}
            className="px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Apply
          </button>
        </div>
      )}
      <div className="p-4">
        {loading ? <LoadBox h="h-44" /> : data.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-teal-300 text-sm">No data</div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              style={{ height: 180 }}
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Y-axis grid lines */}
              {yLabels.map((v, i) => (
                <g key={i}>
                  <line
                    x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)}
                    stroke="#e0f2f1" strokeWidth="1" strokeDasharray="4 3"
                  />
                  <text x={PAD.left - 4} y={y(v) + 4} textAnchor="end"
                    fontSize="9" fill="#94a3b8" fontFamily="'DM Mono', monospace">
                    {fmt(v).replace("₹", "")}
                  </text>
                </g>
              ))}

              {/* Area fill */}
              <polygon points={areaPoints} fill="url(#revGrad)" />

              {/* Line */}
              <polyline
                points={points}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* X-axis labels */}
              {xLabels.map((d, i) => {
                const origIdx = data.indexOf(d);
                return (
                  <text key={i} x={x(origIdx)} y={H - PAD.bottom + 14}
                    textAnchor="middle" fontSize="9" fill="#94a3b8"
                    fontFamily="'DM Mono', monospace">
                    {d.date.slice(5)} {/* MM-DD */}
                  </text>
                );
              })}

              {/* Hover dots + tooltip trigger */}
              {data.map((d, i) => (
                <circle
                  key={i} cx={x(i)} cy={y(d.revenue)} r="14" fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHover({ idx: i, x: x(i), y: y(d.revenue) })}
                />
              ))}

              {/* Active dot */}
              {hover !== null && (
                <>
                  <line x1={hover.x} y1={PAD.top} x2={hover.x} y2={H - PAD.bottom}
                    stroke="#0d9488" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
                  <circle cx={hover.x} cy={hover.y} r="5" fill="#0d9488" stroke="#fff" strokeWidth="2" />
                </>
              )}
            </svg>

            {/* Tooltip */}
            {hover !== null && data[hover.idx] && (
              <div className="absolute pointer-events-none z-10 bg-teal-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs"
                style={{
                  left: `${(hover.x / W) * 100}%`,
                  top: hover.y < 60 ? "40%" : "8%",
                  transform: "translateX(-50%)",
                  fontFamily: "'DM Mono', monospace",
                  minWidth: 120,
                }}>
                <p className="font-bold text-teal-200">{data[hover.idx].date}</p>
                <p className="mt-0.5">Revenue: <span className="text-teal-300 font-bold">{fmtFull(data[hover.idx].revenue)}</span></p>
                <p>Orders: <span className="text-teal-300 font-bold">{data[hover.idx].orders}</span></p>
              </div>
            )}
          </div>
        )}
        {/* Summary row below chart */}
        {!loading && data.length > 0 && (
          <div className="flex gap-6 mt-3 pt-3 border-t border-teal-50">
            <div>
              <p className="text-xs text-teal-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>Total Revenue</p>
              <p className="font-black text-teal-700 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                {fmtFull(data.reduce((s, d) => s + d.revenue, 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-teal-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>Total Orders</p>
              <p className="font-black text-teal-700 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                {data.reduce((s, d) => s + d.orders, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-teal-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>Avg/Day</p>
              <p className="font-black text-teal-700 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                {fmtFull(data.reduce((s, d) => s + d.revenue, 0) / (data.length || 1))}
              </p>
            </div>
          </div>
        )}
      </div>
    </CardShell>
  );
};

/* ─────────────────────────────────────────────────────────────
   ROW 2 RIGHT — ORDER STATUS DONUT (pure SVG)
───────────────────────────────────────────────────────────── */

const DONUT_COLORS: Record<string, string> = {
  delivered: "#10b981",
  confirmed: "#3b82f6",
  ready: "#f59e0b",
  pending: "#eab308",
  cancelled: "#ef4444",
};

const OrderStatusDonut: React.FC<{ data: OrderStatusData | null; loading: boolean }> = ({
  data, loading,
}) => {
  const entries = data
    ? Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];
  const total = entries.reduce((s, [, v]) => s + v, 0);

  // SVG donut
  const R = 60, r = 38, CX = 75, CY = 75;
  let startAngle = -Math.PI / 2;
  const slices = entries.map(([key, val]) => {
    const pct = val / (total || 1);
    const angle = pct * 2 * Math.PI;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(startAngle + angle);
    const y2 = CY + R * Math.sin(startAngle + angle);
    const x3 = CX + r * Math.cos(startAngle + angle);
    const y3 = CY + r * Math.sin(startAngle + angle);
    const x4 = CX + r * Math.cos(startAngle);
    const y4 = CY + r * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
    const result = { key, val, pct, path, color: DONUT_COLORS[key] ?? "#94a3b8" };
    startAngle += angle;
    return result;
  });

  return (
    <CardShell>
      <CardHeader title="Order Status" subtitle="All-time distribution" />
      <div className="p-5">
        {loading ? <LoadBox h="h-44" /> : (
          <>
            <div className="flex items-center gap-4">
              {/* Donut */}
              <svg viewBox="0 0 150 150" className="w-32 h-32 flex-shrink-0">
                {total === 0 ? (
                  <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e0f2f1" strokeWidth={R - r} />
                ) : slices.map((s, i) => (
                  <path key={i} d={s.path} fill={s.color} opacity="0.9" />
                ))}
                <text x={CX} y={CY - 5} textAnchor="middle" fontSize="14" fontWeight="700"
                  fill="#0f766e" fontFamily="'DM Mono', monospace">{total}</text>
                <text x={CX} y={CY + 11} textAnchor="middle" fontSize="8"
                  fill="#6b7280" fontFamily="'DM Sans', sans-serif">total</text>
              </svg>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                {slices.length === 0 ? (
                  <p className="text-teal-400 text-xs">No orders yet</p>
                ) : slices.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: s.color }} />
                      <span className="text-xs capitalize text-teal-700 font-semibold"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {s.key}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-teal-900"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {s.val}
                      </span>
                      <span className="text-xs text-teal-400"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {(s.pct * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </CardShell>
  );
};

/* ─────────────────────────────────────────────────────────────
   ROW 3 LEFT — RECENT ORDERS TABLE
───────────────────────────────────────────────────────────── */

const RecentOrdersTable: React.FC<{ orders: RecentOrder[]; loading: boolean }> = ({
  orders, loading,
}) => (
  <CardShell>
    <CardHeader title="Recent Orders" subtitle="Latest transactions" />
    {loading ? <LoadBox h="h-56" /> : (
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <thead>
            <tr className="bg-teal-50/40">
              {["Order #", "Customer", "Items", "Amount", "Payment", "Status", "Time"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-teal-500 uppercase tracking-wide border-b border-teal-50 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-teal-300 text-sm">No orders yet</td></tr>
            ) : orders.map((o, i) => (
              <tr key={o._id}
                className={`border-b border-teal-50 hover:bg-teal-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-teal-50/10"}`}>
                <td className="px-4 py-3">
                  <span className="font-bold text-teal-700 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {o.orderNumber}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {o.customer ? (
                    <div>
                      <p className="font-semibold text-teal-900 text-xs">{o.customer.name}</p>
                      <p className="text-teal-400 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {o.customer.phone}
                      </p>
                    </div>
                  ) : <span className="text-teal-300 text-xs italic">Walk-in</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-teal-600 text-xs font-semibold">{o.itemCount} item{o.itemCount !== 1 ? "s" : ""}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-black text-teal-900 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {fmtFull(o.finalAmount)}
                  </p>
                  {o.discount > 0 && (
                    <p className="text-teal-400 text-xs line-through">{fmtFull(o.totalAmount)}</p>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={o.paymentStatus} type="payment" /></td>
                <td className="px-4 py-3"><StatusBadge status={o.orderStatus} type="order" /></td>
                <td className="px-4 py-3">
                  <span className="text-teal-400 text-xs whitespace-nowrap">{timeAgo(o.createdAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);

/* ─────────────────────────────────────────────────────────────
   ROW 3 RIGHT — TOP PRODUCTS (horizontal bar)
───────────────────────────────────────────────────────────── */

const TopProductsBar: React.FC<{ products: TopProduct[]; loading: boolean }> = ({
  products, loading,
}) => {
  const maxRev = Math.max(...products.map(p => p.revenue), 1);

  const TYPE_ICON: Record<string, string> = {
    food: "🍖", accessory: "🎀", medicine: "💊", animal: "🐾", other: "📦",
  };

  return (
    <CardShell>
      <CardHeader title="Top Products" subtitle="By revenue this period" />
      <div className="p-4 space-y-3">
        {loading ? <LoadBox h="h-44" /> : products.length === 0 ? (
          <p className="text-teal-300 text-sm text-center py-10">No product data</p>
        ) : products.map((p, i) => (
          <div key={p._id}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{TYPE_ICON[p.type] ?? "📦"}</span>
                <div className="min-w-0">
                  <p className="font-bold text-teal-900 text-xs truncate max-w-[140px]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {p.name ?? "Unknown Product"}
                  </p>
                  <p className="text-teal-400 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {p.orderCount} orders
                  </p>
                </div>
              </div>
              <span className="font-black text-teal-700 text-xs ml-2 flex-shrink-0"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                {fmt(p.revenue)}
              </span>
            </div>
            <div className="h-2 bg-teal-50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(p.revenue / maxRev) * 100}%`,
                  background: `linear-gradient(90deg, #0d9488, ${i === 0 ? "#2dd4bf" : "#5eead4"})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
};

/* ─────────────────────────────────────────────────────────────
   ROW 4 LEFT — LOW STOCK TABLE
───────────────────────────────────────────────────────────── */

const LowStockTable: React.FC<{ items: LowStockItem[]; total: number; loading: boolean }> = ({
  items, total, loading,
}) => {
  const urgency = (stock: number): { color: string; bg: string; label: string } => {
    if (stock === 0) return { color: "#991b1b", bg: "#fee2e2", label: "Out of Stock" };
    if (stock <= 2) return { color: "#9a3412", bg: "#fed7aa", label: "Critical" };
    return { color: "#854d0e", bg: "#fef9c3", label: "Low" };
  };

  return (
    <CardShell>
      <CardHeader
        title="Low Stock Alerts"
        subtitle={`${total} variant${total !== 1 ? "s" : ""} need attention`}
        action={
          total > 0 ? (
            <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 rounded-full text-xs font-bold">
              {total} alerts
            </span>
          ) : undefined
        }
      />
      {loading ? <LoadBox h="h-48" /> : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr className="bg-teal-50/40">
                {["Product", "SKU", "Category", "Stock", "Urgency", "Price"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-teal-500 uppercase tracking-wide border-b border-teal-50 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">✅</span>
                      <p className="text-teal-400 text-sm">All products well-stocked!</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((item, i) => {
                const u = urgency(item.inStock);
                const attrStr = Object.values(item.attributes).filter(Boolean).join(" · ") || "—";
                return (
                  <tr key={item.variantId}
                    className={`border-b border-teal-50 hover:bg-teal-50/20 transition-colors ${i % 2 === 0 ? "" : "bg-teal-50/5"}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-teal-900 text-xs">{item.productName}</p>
                      <p className="text-teal-400 text-xs mt-0.5">{attrStr}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-teal-600 font-mono"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {item.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-teal-600">{item.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-black text-sm" style={{ color: u.color, fontFamily: "'DM Mono', monospace" }}>
                        {item.inStock}
                      </span>
                      <span className="text-teal-400 text-xs ml-1">{item.baseUnit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: u.bg, color: u.color }}>
                        {u.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-teal-700"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {fmtFull(item.sellingPrice)}/{item.priceUnit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
};

/* ─────────────────────────────────────────────────────────────
   ROW 4 RIGHT — PAYMENT SUMMARY
───────────────────────────────────────────────────────────── */

const PaymentSummaryCard: React.FC<{ data: PaymentSummaryData | null; loading: boolean }> = ({
  data, loading,
}) => {
  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    paid: { label: "Paid", color: "#065f46", bg: "#d1fae5", icon: "✅" },
    pending: { label: "Pending", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
    partial: { label: "Partial", color: "#075985", bg: "#e0f2fe", icon: "💸" },
    refunded: { label: "Refunded", color: "#9d174d", bg: "#fce7f3", icon: "↩️" },
  };
  const METHOD_CFG: Record<string, { label: string; icon: string; color: string }> = {
    cash: { label: "Cash", icon: "💵", color: "#15803d" },
    card: { label: "Card", icon: "💳", color: "#1d4ed8" },
    online: { label: "Online", icon: "📲", color: "#7c3aed" },
    other: { label: "Other", icon: "🔀", color: "#6b7280" },
  };

  const totalPaid = data?.byStatus.paid.total ?? 0;
  const totalPending = data?.byStatus.pending.total ?? 0;
  const totalAll = Object.values(data?.byStatus ?? {}).reduce((s, v) => s + v.total, 0);

  return (
    <CardShell>
      <CardHeader title="Payment Summary" subtitle="Revenue collection breakdown" />
      {loading ? <LoadBox h="h-48" /> : (
        <div className="p-4 space-y-5">
          {/* Collection rate */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-teal-600"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Collection Rate
              </span>
              <span className="text-xs font-black text-teal-800"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                {totalAll > 0 ? ((totalPaid / totalAll) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="h-2 bg-teal-50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: totalAll > 0 ? `${(totalPaid / totalAll) * 100}%` : "0%",
                  background: "linear-gradient(90deg, #0d9488, #2dd4bf)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-teal-400 mt-1"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              <span>Collected: {fmtFull(totalPaid)}</span>
              <span>Pending: {fmtFull(totalPending)}</span>
            </div>
          </div>

          {/* By status */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-wide"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              By Payment Status
            </p>
            {Object.entries(data?.byStatus ?? {}).map(([key, val]) => {
              const cfg = STATUS_CFG[key];
              if (!cfg) return null;
              return (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-xl"
                  style={{ background: cfg.bg }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cfg.icon}</span>
                    <span className="text-xs font-bold" style={{ color: cfg.color, fontFamily: "'DM Sans', sans-serif" }}>
                      {cfg.label}
                    </span>
                    <span className="text-xs opacity-60" style={{ color: cfg.color }}>
                      ({val.count} orders)
                    </span>
                  </div>
                  <span className="text-xs font-black" style={{ color: cfg.color, fontFamily: "'DM Mono', monospace" }}>
                    {fmtFull(val.total)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* By method */}
          <div className="space-y-2 border-t border-teal-50 pt-4">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-wide"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              By Payment Method
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(data?.byMethod ?? {}).map(([key, val]) => {
                const cfg = METHOD_CFG[key];
                if (!cfg) return null;
                return (
                  <div key={key} className="flex items-center gap-2 p-2.5 bg-teal-50/50 rounded-xl border border-teal-100">
                    <span className="text-base">{cfg.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-teal-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {cfg.label}
                      </p>
                      <p className="text-xs font-black text-teal-900 truncate"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {fmt(val.total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN DASHBOARD PAGE
───────────────────────────────────────────────────────────── */

const Dashboard: React.FC = () => {
  // Data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<RevenueChartPoint[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<{ items: LowStockItem[]; total: number }>({ items: [], total: 0 });
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryData | null>(null);

  // Loading states
  const [loading, setLoading] = useState({
    stats: true, chart: true, orderStatus: true,
    recentOrders: true, topProducts: true,
    lowStock: true, paymentSummary: true,
  });

  const setL = (key: keyof typeof loading, val: boolean) =>
    setLoading(p => ({ ...p, [key]: val }));

  // Fetch all on mount
  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setL("stats", false));

    getOrderStatus()
      .then(setOrderStatus)
      .catch(console.error)
      .finally(() => setL("orderStatus", false));

    getRecentOrders(8)
      .then(setRecentOrders)
      .catch(console.error)
      .finally(() => setL("recentOrders", false));

    getTopProducts(5)
      .then(setTopProducts)
      .catch(console.error)
      .finally(() => setL("topProducts", false));

    getLowStock(5, 10)
      .then(d => setLowStock({ items: d.items, total: d.total }))
      .catch(console.error)
      .finally(() => setL("lowStock", false));

    getPaymentSummary()
      .then(setPaymentSummary)
      .catch(console.error)
      .finally(() => setL("paymentSummary", false));

    // Chart: default 30 days
    fetchChart(daysAgo(29), today());
  }, []);

  const fetchChart = useCallback((from: string, to: string) => {
    setL("chart", true);
    getRevenueChart(from, to)
      .then(d => setChartData(d.chartData))
      .catch(console.error)
      .finally(() => setL("chart", false));
  }, []);

  /* ── Stat card configs ── */
  const statCards = stats
    ? [
      {
        label: "Today's Revenue",
        value: fmt(stats.todayRevenue),
        accent: "teal",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" /></svg>,
        sub: `${stats.ordersToday} orders today`,
      },
      {
        label: "Month Revenue",
        value: fmt(stats.thisMonthRevenue),
        change: stats.monthVsLast,
        accent: "blue",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
        sub: `Last month: ${fmt(stats.lastMonthRevenue)}`,
      },
      {
        label: "Total Revenue",
        value: fmt(stats.totalRevenue),
        accent: "green",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
        sub: "All-time earnings",
      },
      {
        label: "Total Profit",
        value: fmt(stats.totalProfit),
        accent: "amber",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
        sub: "Selling minus buying",
      },
      {
        label: "Orders Today",
        value: String(stats.ordersToday),
        accent: "purple",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>,
        sub: `${stats.ordersTodayByStatus.delivered} delivered`,
      },
      {
        label: "Low Stock Alerts",
        value: String(stats.lowStockCount),
        accent: stats.lowStockCount > 0 ? "red" : "green",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stats.lowStockCount > 0 ? "#be123c" : "#15803d"} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
        sub: `${stats.activeProducts}/${stats.totalProducts} products active`,
      },
    ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-teal-50/20"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* ── Page Header ── */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-teal-900 tracking-tight">Dashboard</h1>
            <p className="text-teal-500 text-sm mt-1">
              Welcome back 👋 — Here's your business overview
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-teal-100 rounded-xl shadow-sm">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-sm text-teal-700 font-semibold"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* ── ROW 1: Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
          {loading.stats
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-teal-100 bg-white p-5 animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-teal-50 mb-3" />
                <div className="h-6 bg-teal-50 rounded mb-2 w-3/4" />
                <div className="h-3 bg-teal-50 rounded w-1/2" />
              </div>
            ))
            : statCards.map(c => (
              <StatCard
                key={c.label}
                label={c.label}
                value={c.value}
                sub={c.sub}
                change={"change" in c ? c.change : undefined}
                icon={c.icon}
                accent={c.accent}
              />
            ))
          }
        </div>

        {/* ── ROW 2: Revenue Chart + Order Donut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <RevenueChart
              data={chartData}
              loading={loading.chart}
              onRangeChange={fetchChart}
            />
          </div>
          <OrderStatusDonut data={orderStatus} loading={loading.orderStatus} />
        </div>

        {/* ── ROW 3: Recent Orders + Top Products ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <RecentOrdersTable orders={recentOrders} loading={loading.recentOrders} />
          </div>
          <TopProductsBar products={topProducts} loading={loading.topProducts} />
        </div>

        {/* ── ROW 4: Low Stock + Payment Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
          <div className="lg:col-span-2">
            <LowStockTable
              items={lowStock.items}
              total={lowStock.total}
              loading={loading.lowStock}
            />
          </div>
          <PaymentSummaryCard data={paymentSummary} loading={loading.paymentSummary} />
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;