"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /** Shows a brief, auto-dismissing notification — for fire-and-forget operation results (save
   * succeeded, publish succeeded, save failed). Not for validation errors that need to stay
   * visible while the user fixes a field; those should remain inline near the field. */
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3200;

/** Mounted once at the root layout so a toast survives the client-side navigation that often
 * follows the action it's confirming (e.g. editor publish redirects to /post/[id] immediately). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-[24px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-[8px] px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto animate-toastin flex items-center gap-[10px] max-w-[360px] bg-white border border-[#e6e4de] border-l-[3px] ${
              t.variant === "error" ? "border-l-[#b64a3f]" : "border-l-[#3a7d5c]"
            } text-[#0e0e0e] text-[13px] font-medium pl-[13px] pr-[16px] py-[12px] rounded-[3px] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.25)]`}
          >
            {t.variant === "error" ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#b64a3f"
                strokeWidth="2"
                className="flex-none"
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3a7d5c"
                strokeWidth="2"
                className="flex-none"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
