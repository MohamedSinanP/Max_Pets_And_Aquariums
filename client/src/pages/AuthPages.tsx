import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../apis/auth";
import type { LoginPayload, RegisterPayload } from "../apis/auth";

/* ─────────────────────────────────────
   Constants & helpers
───────────────────────────────────── */
const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_DARKER = "#134e4a";
const TEAL_MID = "#14b8a6";
const TEAL_LIGHT = "#ccfbf1";
const TEAL_BG = "#f0fdfa";

const paw = (
  <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="42" rx="14" ry="11" fill="rgba(255,255,255,0.22)" />
    <ellipse cx="15" cy="28" rx="7" ry="9" fill="rgba(255,255,255,0.18)" />
    <ellipse cx="49" cy="28" rx="7" ry="9" fill="rgba(255,255,255,0.18)" />
    <ellipse cx="22" cy="18" rx="5" ry="7" fill="rgba(255,255,255,0.14)" />
    <ellipse cx="42" cy="18" rx="5" ry="7" fill="rgba(255,255,255,0.14)" />
  </svg>
);

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/* ─────────────────────────────────────
   Shared input component
───────────────────────────────────── */
interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  suffix?: React.ReactNode;
}

function Field({ label, type = "text", value, onChange, placeholder, error, autoComplete, suffix }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 800,
          color: focused ? TEAL_DARK : "#5eaaa0",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          fontFamily: "'DM Sans', sans-serif",
          transition: "color 0.2s",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: suffix ? "13px 44px 13px 16px" : "13px 16px",
            border: `2px solid ${error ? "#fca5a5" : focused ? TEAL : TEAL_LIGHT}`,
            borderRadius: 12,
            fontSize: 14,
            color: "#0d4f4a",
            background: focused ? "#fff" : TEAL_BG,
            outline: "none",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
            boxSizing: "border-box",
            boxShadow: focused ? `0 0 0 4px rgba(13,148,136,0.08)` : "none",
          }}
        />
        {suffix && (
          <div
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#5eaaa0",
              cursor: "pointer",
              display: "flex",
            }}
          >
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p style={{ margin: "5px 0 0", fontSize: 12, color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   Decorative left panel
───────────────────────────────────── */
function Panel({ mode }: { mode: "login" | "register" }) {
  return (
    <div
      style={{
        flex: "0 0 42%",
        background: `linear-gradient(160deg, ${TEAL_DARKER} 0%, ${TEAL_DARK} 40%, ${TEAL_MID} 100%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 40px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background circles */}
      {[
        { w: 320, h: 320, top: -80, left: -80, o: 0.06 },
        { w: 220, h: 220, top: "auto", bottom: -60, right: -60, o: 0.08 },
        { w: 140, h: 140, top: "40%", left: "60%", o: 0.05 },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: c.w,
            height: c.h,
            borderRadius: "50%",
            background: "#fff",
            opacity: c.o,
            top: (c as any).top,
            left: (c as any).left,
            right: (c as any).right,
            bottom: (c as any).bottom,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }}
      />

      {/* Logo mark */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: "rgba(255,255,255,0.12)",
          border: "1.5px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          backdropFilter: "blur(8px)",
        }}
      >
        {paw}
      </div>

      <h1
        style={{
          color: "#fff",
          fontSize: 34,
          fontWeight: 900,
          fontFamily: "'DM Sans', sans-serif",
          margin: "0 0 12px",
          letterSpacing: "-1px",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        Max Pets
        <br />
        <span style={{ fontWeight: 400, fontSize: 20, opacity: 0.75 }}>Admin</span>
      </h1>

      <p
        style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: 14,
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
          maxWidth: 260,
          lineHeight: 1.7,
          margin: "0 0 40px",
        }}
      >
        {mode === "login"
          ? "Welcome back. Sign in to manage your pet store."
          : "Create your account and start managing your store."}
      </p>

      {/* Feature pills */}
      {["Product Management", "Order Tracking", "Analytics"].map((f) => (
        <div
          key={f}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            width: "100%",
            maxWidth: 240,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 8,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            {f}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────
   LOGIN PAGE
───────────────────────────────────── */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^@]+@gmail\.com$/.test(email)) e.email = "Must be a valid Gmail address";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "At least 6 characters";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setApiError("");
    try {
      await login({ email: email.trim(), password } as LoginPayload);
      navigate("/dashboard");
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Left panel — hidden on mobile, shown as top banner */}
      {isMobile ? (
        <div
          style={{
            background: `linear-gradient(135deg, ${TEAL_DARKER}, ${TEAL_MID})`,
            padding: "32px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
              <ellipse cx="32" cy="42" rx="14" ry="11" fill="rgba(255,255,255,0.3)" />
              <ellipse cx="15" cy="28" rx="7" ry="9" fill="rgba(255,255,255,0.25)" />
              <ellipse cx="49" cy="28" rx="7" ry="9" fill="rgba(255,255,255,0.25)" />
              <ellipse cx="22" cy="18" rx="5" ry="7" fill="rgba(255,255,255,0.2)" />
              <ellipse cx="42" cy="18" rx="5" ry="7" fill="rgba(255,255,255,0.2)" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, letterSpacing: "-0.3px" }}>
              Max Pets Admin
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              Sign in to your account
            </div>
          </div>
        </div>
      ) : (
        <Panel mode="login" />
      )}

      {/* Right — Form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? "32px 24px" : "60px 64px",
          background: "#fff",
          overflowY: "auto",
        }}
        onKeyDown={handleKeyDown}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Heading */}
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: isMobile ? 24 : 28,
              fontWeight: 900,
              color: "#0d4f4a",
              letterSpacing: "-0.5px",
            }}
          >
            Sign in
          </h2>
          <p style={{ margin: "0 0 36px", color: "#5eaaa0", fontSize: 14 }}>
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              style={{ color: TEAL, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Register
            </span>
          </p>

          {/* API Error */}
          {apiError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#dc2626",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>⚠</span> {apiError}
            </div>
          )}

          {/* Fields */}
          <Field
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@gmail.com"
            autoComplete="email"
            error={errors.email}
          />
          <Field
            label="Password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password}
            suffix={
              <span onClick={() => setShowPass((p) => !p)}>
                {showPass ? <EyeClosed /> : <EyeOpen />}
              </span>
            }
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading
                ? TEAL_LIGHT
                : `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL_MID} 100%)`,
              color: loading ? TEAL_DARK : "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 8,
              transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 16px rgba(13,148,136,0.3)",
              letterSpacing: "0.2px",
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "28px 0",
              color: "#9ed8d4",
              fontSize: 12,
            }}
          >
            <div style={{ flex: 1, height: 1, background: TEAL_LIGHT }} />
            Secure login
            <div style={{ flex: 1, height: 1, background: TEAL_LIGHT }} />
          </div>

          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#9ed8d4",
              margin: 0,
            }}
          >
            Protected by JWT authentication & secure cookies
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   REGISTER PAGE
───────────────────────────────────── */
export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^@]+@gmail\.com$/.test(email)) e.email = "Must be a valid Gmail address";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "At least 6 characters";
    if (confirmPassword !== password) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setApiError("");
    try {
      await register({ name: name.trim(), email: email.trim(), password } as RegisterPayload);
      navigate("/dashboard");
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  /* Password strength */
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#16a34a"][strength];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Left panel */}
      {isMobile ? (
        <div
          style={{
            background: `linear-gradient(135deg, ${TEAL_DARKER}, ${TEAL_MID})`,
            padding: "32px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
              <ellipse cx="32" cy="42" rx="14" ry="11" fill="rgba(255,255,255,0.3)" />
              <ellipse cx="15" cy="28" rx="7" ry="9" fill="rgba(255,255,255,0.25)" />
              <ellipse cx="49" cy="28" rx="7" ry="9" fill="rgba(255,255,255,0.25)" />
              <ellipse cx="22" cy="18" rx="5" ry="7" fill="rgba(255,255,255,0.2)" />
              <ellipse cx="42" cy="18" rx="5" ry="7" fill="rgba(255,255,255,0.2)" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, letterSpacing: "-0.3px" }}>
              Max Pets Admin
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              Create your account
            </div>
          </div>
        </div>
      ) : (
        <Panel mode="register" />
      )}

      {/* Right — Form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? "32px 24px" : "60px 64px",
          background: "#fff",
          overflowY: "auto",
        }}
        onKeyDown={handleKeyDown}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: isMobile ? 24 : 28,
              fontWeight: 900,
              color: "#0d4f4a",
              letterSpacing: "-0.5px",
            }}
          >
            Create account
          </h2>
          <p style={{ margin: "0 0 36px", color: "#5eaaa0", fontSize: 14 }}>
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              style={{ color: TEAL, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Sign in
            </span>
          </p>

          {apiError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#dc2626",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>⚠</span> {apiError}
            </div>
          )}

          <Field
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="John Doe"
            autoComplete="name"
            error={errors.name}
          />
          <Field
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@gmail.com"
            autoComplete="email"
            error={errors.email}
          />
          <Field
            label="Password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            error={errors.password}
            suffix={
              <span onClick={() => setShowPass((p) => !p)}>
                {showPass ? <EyeClosed /> : <EyeOpen />}
              </span>
            }
          />

          {/* Password strength bar */}
          {password.length > 0 && (
            <div style={{ marginTop: -10, marginBottom: 18 }}>
              <div
                style={{
                  height: 4,
                  borderRadius: 4,
                  background: TEAL_LIGHT,
                  overflow: "hidden",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(strength / 3) * 100}%`,
                    background: strengthColor,
                    borderRadius: 4,
                    transition: "width 0.3s, background 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: strengthColor }}>
                {strengthLabel}
              </span>
            </div>
          )}

          <Field
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter password"
            autoComplete="new-password"
            error={errors.confirmPassword}
            suffix={
              <span onClick={() => setShowConfirm((p) => !p)}>
                {showConfirm ? <EyeClosed /> : <EyeOpen />}
              </span>
            }
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading
                ? TEAL_LIGHT
                : `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL_MID} 100%)`,
              color: loading ? TEAL_DARK : "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 8,
              transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 16px rgba(13,148,136,0.3)",
              letterSpacing: "0.2px",
            }}
          >
            {loading ? "Creating account…" : "Create Account →"}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#9ed8d4",
              margin: "20px 0 0",
            }}
          >
            By registering you agree to our terms of service
          </p>
        </div>
      </div>
    </div>
  );
}