/**
 * SettingsPage.tsx
 *
 * Admin settings page — Update Profile + Change Password
 * Teal + white color scheme · DM Sans + DM Mono fonts · Tailwind CSS
 * Wired to real API: updateProfile, updatePassword, getMe
 */

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { updateProfile, updatePassword, getMe } from "../apis/auth";
import type { UpdateProfilePayload, UpdatePasswordPayload } from "../apis/auth";

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────

interface ProfileForm {
  name: string;
  phone: string;
  email: string;
  avatar: string; // preview URL or existing URL
  avatarFile: File | null; // actual file to upload
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FieldError {
  [key: string]: string;
}

// ─────────────────────────────────────────────────────────────
//  SMALL UI ATOMS
// ─────────────────────────────────────────────────────────────

const Spinner: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = "#0d9488",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className="animate-spin"
  >
    <circle cx="12" cy="12" r="10" stroke="#ccf5f0" strokeWidth="3" />
    <path
      d="M12 2 A10 10 0 0 1 22 12"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

interface InputFieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  hint,
  autoComplete,
  disabled = false,
  icon,
  suffix,
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-xs font-bold text-teal-700 uppercase tracking-wide"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {label}
    </label>
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-300 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={[
          "w-full rounded-xl border-2 py-2.5 text-sm text-teal-900 bg-white transition-all",
          "placeholder-teal-300 focus:outline-none",
          icon ? "pl-10 pr-4" : "px-4",
          suffix ? "pr-12" : "",
          error
            ? "border-red-300 focus:border-red-400"
            : "border-teal-100 focus:border-teal-400 hover:border-teal-200",
          disabled ? "bg-teal-50/60 text-teal-400 cursor-not-allowed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {suffix}
        </span>
      )}
    </div>
    {error && (
      <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {error}
      </p>
    )}
    {hint && !error && (
      <p className="text-xs text-teal-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {hint}
      </p>
    )}
  </div>
);

interface AlertProps {
  type: "success" | "error";
  message: string;
  onDismiss?: () => void;
}
const Alert: React.FC<AlertProps> = ({ type, message, onDismiss }) => (
  <div
    className={[
      "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-semibold animate-fade-in",
      type === "success"
        ? "bg-teal-50 border-teal-200 text-teal-700"
        : "bg-red-50 border-red-200 text-red-600",
    ].join(" ")}
    style={{ fontFamily: "'DM Sans', sans-serif" }}
  >
    {type === "success" ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )}
    <span className="flex-1">{message}</span>
    {onDismiss && (
      <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
//  AVATAR UPLOADER
// ─────────────────────────────────────────────────────────────

interface AvatarUploaderProps {
  name: string;
  avatarUrl: string;
  onAvatarChange: (url: string, file: File | null) => void;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  name,
  avatarUrl,
  onAvatarChange,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    onAvatarChange(previewUrl, file);
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0 group">
        <div className="w-20 h-20 rounded-2xl border-2 border-teal-100 overflow-hidden bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-100">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="text-white text-xl font-black"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {initials}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 rounded-2xl bg-teal-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div>
        <p
          className="font-bold text-teal-900 text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Profile Photo
        </p>
        <p
          className="text-teal-400 text-xs mt-0.5"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          JPG, PNG or GIF · Max 2MB
        </p>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-xs font-bold border-2 border-teal-200 text-teal-600 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-all"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Change Photo
          </button>

          {avatarUrl && (
            <button
              type="button"
              onClick={() => onAvatarChange("", null)}
              className="px-3 py-1.5 text-xs font-bold border-2 border-red-100 text-red-400 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  PASSWORD STRENGTH INDICATOR
// ─────────────────────────────────────────────────────────────

const getPasswordStrength = (
  pw: string
): { score: number; label: string; color: string } => {
  if (!pw) return { score: 0, label: "", color: "#e5e7eb" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
  if (score === 2) return { score: 2, label: "Fair", color: "#f97316" };
  if (score === 3) return { score: 3, label: "Good", color: "#eab308" };
  if (score === 4) return { score: 4, label: "Strong", color: "#22c55e" };
  return { score: 5, label: "Very Strong", color: "#0d9488" };
};

const PasswordStrengthBar: React.FC<{ password: string }> = ({ password }) => {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i <= score ? color : "#e5e7eb",
            }}
          />
        ))}
      </div>
      <p
        className="text-xs font-semibold"
        style={{ color, fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  SECTION CARD WRAPPER
// ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon,
  children,
}) => (
  <div className="bg-white rounded-3xl border border-teal-100 shadow-sm shadow-teal-50 overflow-hidden">
    {/* Header strip */}
    <div className="flex items-center gap-4 px-6 py-5 border-b border-teal-50 bg-gradient-to-r from-teal-50/80 to-white">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-200 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3
          className="font-black text-teal-900 text-base tracking-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {title}
        </h3>
        <p
          className="text-teal-400 text-xs mt-0.5"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {subtitle}
        </p>
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
//  PROFILE SECTION
// ─────────────────────────────────────────────────────────────

interface ProfileSectionProps {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialAvatar: string;
  onProfileUpdated: (name: string, email: string, avatar: string) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  userId,
  initialName,
  initialEmail,
  initialPhone,
  initialAvatar,
  onProfileUpdated,
}) => {
  const [form, setForm] = useState<ProfileForm>({
    name: initialName,
    email: initialEmail,
    phone: initialPhone,
    avatar: initialAvatar,
    avatarFile: null,
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Keep in sync if parent re-fetches
  useEffect(() => {
    setForm({
      name: initialName,
      email: initialEmail,
      phone: initialPhone,
      avatar: initialAvatar,
      avatarFile: null,
    });
  }, [initialName, initialEmail, initialPhone, initialAvatar]);

  const set = (key: keyof ProfileForm) => (val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const handleAvatarChange = (url: string, file: File | null) => {
    setForm((p) => ({
      ...p,
      avatar: url,
      avatarFile: file,
    }));
  };

  const validate = (): boolean => {
    const e: FieldError = {};

    if (!form.name.trim()) e.name = "Name is required";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters";

    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Enter a valid email address";
    }

    if (form.phone && !/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) {
      e.phone = "Enter a valid phone number";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setAlert(null);

    try {
      const payload: UpdateProfilePayload = {
        userId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || undefined,
        avatarFile: form.avatarFile,
      };

      const res = await updateProfile(payload);

      const updatedAvatar =
        typeof res?.data?.avatar === "string"
          ? res.data.avatar
          : res?.data?.avatar?.url ?? form.avatar;

      setAlert({ type: "success", message: "Profile updated successfully!" });

      setForm((prev) => ({
        ...prev,
        avatar: updatedAvatar,
        avatarFile: null,
      }));

      onProfileUpdated(form.name.trim(), form.email.trim(), updatedAvatar);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setAlert({
        type: "error",
        message: err?.response?.data?.message ?? "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Profile Information"
      subtitle="Update your name, phone and photo"
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      }
    >
      <div className="space-y-6">
        {/* Avatar */}
        <AvatarUploader
          name={form.name || initialName}
          avatarUrl={form.avatar || ""}
          onAvatarChange={handleAvatarChange}
        />

        <div className="border-t border-teal-50 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Full Name"
            id="profile-name"
            value={form.name}
            onChange={set("name")}
            placeholder="Your full name"
            error={errors.name}
            autoComplete="name"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />

          <InputField
            label="Email Address"
            id="profile-email"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@example.com"
            error={errors.email}
            autoComplete="email"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
          />

          <InputField
            label="Phone Number"
            id="profile-phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+91 9876543210"
            error={errors.phone}
            autoComplete="tel"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6 6l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" />
              </svg>
            }
          />
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        )}

        <div className="flex items-center justify-between pt-2 border-t border-teal-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className={[
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
              saving
                ? "bg-teal-200 text-white cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md hover:shadow-teal-200",
            ].join(" ")}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {saving ? (
              <><Spinner size={15} color="white" /> Saving…</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────
//  PASSWORD SECTION
// ─────────────────────────────────────────────────────────────

interface PasswordSectionProps {
  userId: string;
}

const PasswordSection: React.FC<PasswordSectionProps> = ({ userId }) => {
  const [form, setForm] = useState<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const set = (key: keyof PasswordForm) => (val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const toggleShow = (key: "old" | "new" | "confirm") =>
    setShowPasswords((p) => ({ ...p, [key]: !p[key] }));

  const validate = (): boolean => {
    const e: FieldError = {};
    if (!form.oldPassword) e.oldPassword = "Current password is required";
    if (!form.newPassword) e.newPassword = "New password is required";
    else if (form.newPassword.length < 6) e.newPassword = "Must be at least 6 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your new password";
    else if (form.newPassword !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (form.oldPassword && form.newPassword && form.oldPassword === form.newPassword)
      e.newPassword = "New password must differ from current password";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setAlert(null);
    try {
      const payload: UpdatePasswordPayload = {
        userId,
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      };
      await updatePassword(payload);
      setAlert({
        type: "success",
        message: "Password changed! A confirmation email has been sent.",
      });
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message ?? "Failed to update password.";
      if (msg.toLowerCase().includes("old password") || msg.toLowerCase().includes("incorrect")) {
        setErrors({ oldPassword: "Current password is incorrect" });
      } else {
        setAlert({ type: "error", message: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {show ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  const eyeBtn = (key: "old" | "new" | "confirm") => (
    <button
      type="button"
      onClick={() => toggleShow(key)}
      className="text-teal-300 hover:text-teal-500 transition-colors"
    >
      <EyeIcon show={showPasswords[key]} />
    </button>
  );

  return (
    <SectionCard
      title="Change Password"
      subtitle="Use a strong password to keep your account secure"
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      }
    >
      <div className="space-y-4">
        <InputField
          label="Current Password"
          id="old-password"
          type={showPasswords.old ? "text" : "password"}
          value={form.oldPassword}
          onChange={set("oldPassword")}
          placeholder="Enter current password"
          error={errors.oldPassword}
          autoComplete="current-password"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
          suffix={eyeBtn("old")}
        />

        <div className="border-t border-teal-50 pt-4 space-y-4">
          <div className="space-y-1.5">
            <InputField
              label="New Password"
              id="new-password"
              type={showPasswords.new ? "text" : "password"}
              value={form.newPassword}
              onChange={set("newPassword")}
              placeholder="Enter new password"
              error={errors.newPassword}
              autoComplete="new-password"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
              suffix={eyeBtn("new")}
            />
            {form.newPassword && <PasswordStrengthBar password={form.newPassword} />}
          </div>

          <InputField
            label="Confirm New Password"
            id="confirm-password"
            type={showPasswords.confirm ? "text" : "password"}
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            placeholder="Confirm new password"
            error={errors.confirmPassword}
            autoComplete="new-password"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            suffix={eyeBtn("confirm")}
          />
        </div>

        {/* Tips */}
        <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-4">
          <p
            className="text-xs font-bold text-teal-600 mb-2 uppercase tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Password requirements
          </p>
          <ul className="space-y-1">
            {[
              { rule: "At least 6 characters", met: form.newPassword.length >= 6 },
              { rule: "At least one uppercase letter", met: /[A-Z]/.test(form.newPassword) },
              { rule: "At least one number", met: /[0-9]/.test(form.newPassword) },
              { rule: "At least one special character", met: /[^A-Za-z0-9]/.test(form.newPassword) },
            ].map((item) => (
              <li
                key={item.rule}
                className={[
                  "flex items-center gap-2 text-xs transition-colors",
                  form.newPassword
                    ? item.met
                      ? "text-teal-600"
                      : "text-teal-300"
                    : "text-teal-300",
                ].join(" ")}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  {item.met && form.newPassword ? (
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <circle cx="12" cy="12" r="10" />
                  )}
                </svg>
                {item.rule}
              </li>
            ))}
          </ul>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        )}

        <div className="flex items-center justify-end pt-2 border-t border-teal-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className={[
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
              saving
                ? "bg-teal-200 text-white cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md hover:shadow-teal-200",
            ].join(" ")}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {saving ? (
              <><Spinner size={15} color="white" /> Updating…</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Update Password
              </>
            )}
          </button>
        </div>
      </div>
    </SectionCard>
  );
};


// ─────────────────────────────────────────────────────────────
//  MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────

interface SettingsUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string | null;
  isActive: boolean;
}

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      try {
        const data = await getMe();
        setUser({
          id: String(data.id),
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone ?? "",
          avatar: typeof data.avatar === "string" ? data.avatar : data.avatar?.url ?? "",
          isActive: data.isActive,
        });
      } catch {
        setLoadError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const handleProfileUpdated = (name: string, email: string, avatar: string) => {
    setUser((prev) =>
      prev ? { ...prev, name, email, avatar } : prev
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-teal-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={36} />
          <p className="text-teal-500 text-sm font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Loading settings…
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-teal-50/20 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="mx-auto mb-3">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-red-600 font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {loadError || "Failed to load."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-teal-50/20 p-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-teal-900 tracking-tight">Settings</h1>
        </div>
        <p className="text-teal-500 text-sm ml-11">
          Manage your account profile and security settings
        </p>
      </div>

      {/* Two-column layout on large screens */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 gap-6">
          {/* Left col — profile + account info */}
          <div className="lg:col-span-2 space-y-6">
            <ProfileSection
              userId={user.id}
              initialName={user.name}
              initialEmail={user.email}
              initialPhone={user.phone ?? ""}
              initialAvatar={user.avatar ?? ""}
              onProfileUpdated={handleProfileUpdated}
            />
            <PasswordSection userId={user.id} />
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity:0; transform:translateY(-4px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease both; }
      `}</style>
    </div>
  );
};

export default SettingsPage;