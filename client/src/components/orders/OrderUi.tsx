import type { OrderStatus, OrderStatusConfigMap, PaymentStatus, PaymentStatusConfigMap } from "../../types/order";

interface SelectOption { value: string; label: string; }
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}
export const Select: React.FC<SelectProps> = ({ value, onChange, options, className = "" }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`px-3 py-2.5 border-2 border-teal-100 rounded-xl text-sm bg-white focus:outline-none focus:border-teal-400 text-teal-800 transition-colors ${className}`}
    style={{ fontFamily: "'DM Sans', sans-serif" }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const ORDER_STATUS_CONFIG: OrderStatusConfigMap = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  confirmed: { label: "Confirmed", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  ready: { label: "Ready", bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  delivered: { label: "Delivered", bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

export const PAYMENT_STATUS_CONFIG: PaymentStatusConfigMap = {
  pending: { label: "Pending", bg: "#fef3c7", color: "#92400e" },
  paid: { label: "Paid", bg: "#d1fae5", color: "#065f46" },
  partial: { label: "Partial", bg: "#e0f2fe", color: "#075985" },
  refunded: { label: "Refunded", bg: "#fce7f3", color: "#9d174d" },
};

interface BadgeProps {
  status: string;
  type?: "order" | "payment";
}
export const Badge: React.FC<BadgeProps> = ({ status, type = "order" }) => {
  const cfg =
    type === "order"
      ? ORDER_STATUS_CONFIG[status as OrderStatus]
      : PAYMENT_STATUS_CONFIG[status as PaymentStatus];
  if (!cfg) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {type === "order" && cfg.dot && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      )}
      {cfg.label}
    </span>
  );
};

export const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="#ccf5f0" strokeWidth="3" />
    <path d="M12 2 A10 10 0 0 1 22 12" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const EmptyState: React.FC<{ message?: string }> = ({ message = "No data found." }) => (
  <div className="flex flex-col items-center justify-center py-20 text-teal-400">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-4 opacity-40">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 9h6M9 12h4" strokeLinecap="round" />
    </svg>
    <p className="font-semibold text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{message}</p>
  </div>
);

type BtnVariant = "solid" | "outline" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";

interface TealBtnProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}
export const TealBtn: React.FC<TealBtnProps> = ({
  onClick,
  children,
  variant = "solid",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}) => {
  const base = "inline-flex items-center gap-2 font-bold rounded-xl transition-all duration-200 cursor-pointer select-none";
  const sizes: Record<BtnSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants: Record<BtnVariant, string> = {
    solid: disabled
      ? "bg-teal-200 text-white cursor-not-allowed"
      : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md",
    outline: disabled
      ? "border-2 border-teal-200 text-teal-300 cursor-not-allowed"
      : "border-2 border-teal-500 text-teal-600 hover:bg-teal-50",
    ghost: "text-teal-600 hover:bg-teal-50",
    danger: disabled
      ? "bg-red-200 text-white cursor-not-allowed"
      : "bg-red-500 hover:bg-red-600 text-white",
  };
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </button>
  );
};
