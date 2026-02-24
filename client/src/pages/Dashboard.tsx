import React from "react";

const stats = [
  { label: "Total Categories", value: "42", change: "+8%", up: true, icon: "📦", color: "#0f766e", bg: "#f0fdfa", border: "#a7f3d0" },
  { label: "Active Products", value: "1,284", change: "+12%", up: true, icon: "🛍️", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
  { label: "Total Orders", value: "389", change: "-3%", up: false, icon: "📋", color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
  { label: "Revenue", value: "₹2.4L", change: "+18%", up: true, icon: "💰", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
];

const recentCategories = [
  { name: "Wild Animals", type: "living", icon: "🦁", status: "Active" },
  { name: "Smart Devices", type: "non-living", icon: "📱", status: "Active" },
  { name: "Tropical Plants", type: "living", icon: "🌺", status: "Active" },
  { name: "Furniture Sets", type: "non-living", icon: "🪑", status: "Inactive" },
  { name: "Aquatic Life", type: "living", icon: "🐟", status: "Active" },
];

const activityLog = [
  { action: "Category Created", subject: "Wild Animals", time: "2 mins ago", icon: "✅", color: "#0f766e" },
  { action: "Category Updated", subject: "Electronics", time: "15 mins ago", icon: "✏️", color: "#0369a1" },
  { action: "Category Deleted", subject: "Old Furniture", time: "1 hr ago", icon: "🗑️", color: "#ef4444" },
  { action: "Status Changed", subject: "Smart Devices → Active", time: "2 hrs ago", icon: "🔄", color: "#7c3aed" },
  { action: "Category Created", subject: "Aquatic Life", time: "Yesterday", icon: "✅", color: "#0f766e" },
];

const Dashboard: React.FC = () => {
  return (
    <div style={{ flex: 1, background: "#f8fffe", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: "28px 32px 24px", background: "white", borderBottom: "1px solid #e0f2f1" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f766e", letterSpacing: "-0.3px" }}>Dashboard</h1>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>Welcome back, Admin 👋 — Here's what's happening today.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 10, background: "#f0fdfa", border: "1px solid #a7f3d0" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0f766e" }} />
            <span style={{ fontSize: 13, color: "#0f766e", fontWeight: 500 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: "20px 22px", background: "white", borderRadius: 16, border: `1px solid ${s.border}`, boxShadow: "0 2px 12px rgba(15,118,110,0.06)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: s.bg, opacity: 0.8 }} />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{s.icon}</div>
                <span style={{ padding: "3px 10px", borderRadius: 20, background: s.up ? "#dcfce7" : "#fef2f2", color: s.up ? "#16a34a" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{s.change}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #e0f2f1", boxShadow: "0 2px 12px rgba(15,118,110,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #e0f2f1", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg, #f0fdfa, white)" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1f2937" }}>Recent Categories</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>Latest additions to your catalog</p>
              </div>
              <button style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid #0d9488", background: "white", color: "#0f766e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>View All</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#fafffe" }}>{["Icon", "Name", "Type", "Status"].map(h => <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
              <tbody>{recentCategories.map((cat, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e0f2f1" }}>
                  <td style={{ padding: "13px 20px", fontSize: 22 }}>{cat.icon}</td>
                  <td style={{ padding: "13px 20px", fontWeight: 600, color: "#1f2937", fontSize: 14 }}>{cat.name}</td>
                  <td style={{ padding: "13px 20px" }}><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: cat.type === "living" ? "#dcfce7" : "#e0f2fe", color: cat.type === "living" ? "#16a34a" : "#0369a1" }}>{cat.type}</span></td>
                  <td style={{ padding: "13px 20px" }}><span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: cat.status === "Active" ? "#f0fdfa" : "#fef2f2", color: cat.status === "Active" ? "#0f766e" : "#ef4444", border: `1px solid ${cat.status === "Active" ? "#a7f3d0" : "#fecaca"}` }}>{cat.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #e0f2f1", boxShadow: "0 2px 12px rgba(15,118,110,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #e0f2f1", background: "linear-gradient(90deg, #f0fdfa, white)" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1f2937" }}>Activity Log</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>Recent system actions</p>
            </div>
            <div style={{ padding: "8px 0" }}>{activityLog.map((log, i) => (
              <div key={i} style={{ padding: "12px 22px", display: "flex", alignItems: "flex-start", gap: 12, borderBottom: i < activityLog.length - 1 ? "1px solid #f0fdfa" : "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${log.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{log.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{log.action}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{log.subject}</div>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", marginTop: 2 }}>{log.time}</span>
              </div>
            ))}</div>
          </div>
        </div>
        <div style={{ marginTop: 20, background: "white", borderRadius: 16, border: "1px solid #e0f2f1", padding: "22px 26px", boxShadow: "0 2px 12px rgba(15,118,110,0.06)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1f2937" }}>Category Distribution</h2>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "🌿 Living", pct: 58, c1: "#16a34a", c2: "#4ade80", bg: "#f0fdf4", tc: "#16a34a" },
              { label: "🔩 Non-Living", pct: 42, c1: "#0369a1", c2: "#38bdf8", bg: "#f0f9ff", tc: "#0369a1" },
              { label: "✅ Active Rate", pct: 80, c1: "#0f766e", c2: "#2dd4bf", bg: "#f0fdfa", tc: "#0f766e" },
            ].map((b) => (
              <div key={b.label} style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{b.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: b.tc }}>{b.pct}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: b.bg, overflow: "hidden" }}>
                  <div style={{ width: `${b.pct}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg,${b.c1},${b.c2})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;