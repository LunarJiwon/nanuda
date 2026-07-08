"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red) instead of the default dark/neutral treatment
   * — use for delete/cancel/account-removal style actions. */
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  message: string;
}

interface ConfirmContextValue {
  /** Promise-based replacement for window.confirm — resolves true/false once the user picks an
   * option in the app's own dialog instead of the browser's native confirm() box. Use this for
   * every destructive/irreversible action (delete a post/comment/account, cancel a subscription,
   * leave an editor with unsaved changes) — this is a standing convention for the app, not a
   * one-off choice for whichever feature introduced it first. */
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/** Mounted once at the root layout, alongside ToastProvider — see that file for the sibling
 * pattern this follows (state lives here, not in each caller, so only one dialog can ever be
 * open at a time app-wide). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest({ message, ...options });
    });
  }, []);

  function settle(confirmed: boolean) {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {request && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-6"
          onClick={() => settle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="animate-toastin w-full max-w-[360px] bg-white border border-[#e6e4de] rounded-[6px] p-[22px] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.25)]"
          >
            <p className="text-[14px] text-[#2c2a26] leading-[1.6] m-0 whitespace-pre-line">{request.message}</p>
            <div className="flex justify-end gap-[8px] mt-[20px]">
              <button
                type="button"
                onClick={() => settle(false)}
                className="text-[13px] font-medium text-[#54524c] border border-[#e0ded8] bg-white px-[14px] py-[8px] rounded-[3px] cursor-pointer"
              >
                {request.cancelLabel ?? "취소"}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                autoFocus
                className={`text-[13px] font-semibold text-white px-[14px] py-[8px] rounded-[3px] cursor-pointer ${
                  request.danger ? "bg-[#b64a3f] border border-[#b64a3f]" : "bg-[#0e0e0e] border border-[#0e0e0e]"
                }`}
              >
                {request.confirmLabel ?? "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx.confirm;
}
