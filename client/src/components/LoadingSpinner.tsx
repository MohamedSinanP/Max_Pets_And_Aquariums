type SizeKey = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<SizeKey, { spinner: string; text: string; gap: string }> = {
  sm: { spinner: "w-6 h-6", text: "text-xs", gap: "gap-2" },
  md: { spinner: "w-10 h-10", text: "text-sm", gap: "gap-3" },
  lg: { spinner: "w-14 h-14", text: "text-base", gap: "gap-4" },
  xl: { spinner: "w-20 h-20", text: "text-lg", gap: "gap-5" },
};

interface LoadingProps {
  size?: SizeKey;
  message?: string;
  overlay?: boolean;
  inline?: boolean;
  className?: string;
}

export default function Loading({
  size = "md",
  message = "Loading…",
  overlay = false,
  inline = false,
  className = "",
}: LoadingProps) {
  const s = sizeMap[size];

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${s.gap} ${className}`}>
      <div className={`${s.spinner} relative`}>
        <svg className="animate-spin w-full h-full" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" stroke="#ccfbf1" strokeWidth="4" />
          <circle cx="20" cy="20" r="16" stroke="#0d9488" strokeWidth="4"
            strokeLinecap="round" strokeDasharray="60 100" />
        </svg>
      </div>
      {message && (
        <p className={`${s.text} font-medium text-teal-700 tracking-wide select-none`}>
          {message}
        </p>
      )}
    </div>
  );

  if (inline) return spinner;

  // Overlay: frosted background + card
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-lg shadow-teal-100 px-10 py-8">
          {spinner}
        </div>
      </div>
    );
  }

  // ✅ Default: perfectly centered on screen, no background
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      {spinner}
    </div>
  );
}