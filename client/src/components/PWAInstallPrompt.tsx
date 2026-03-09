import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const HIDE_FOR_DAYS = 1;
const DISMISS_KEY = "pwa-install-dismissed-at";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // for iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const lastDismissedTime = Number(dismissedAt);
      const hideDuration = HIDE_FOR_DAYS * 24 * 60 * 60 * 1000;

      if (Date.now() - lastDismissedTime < hideDuration) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        localStorage.removeItem(DISMISS_KEY);
      } else {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("Install prompt failed:", error);
    }
  };

  const handleClose = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDeferredPrompt(null);
  };

  if (installed || !deferredPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        onClick={handleInstall}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: "#0d9488",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(13,148,136,0.25)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Install App
      </button>

      <button
        onClick={handleClose}
        aria-label="Close install prompt"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: "none",
          background: "#0f172a",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(15,23,42,0.2)",
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        ×
      </button>
    </div>
  );
}