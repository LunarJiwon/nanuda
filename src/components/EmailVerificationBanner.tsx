"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  FunctionsError,
  sendVerificationEmailCall,
  VERIFICATION_SEND_FAILED_KEY,
} from "@/lib/emailVerification-client";

const COOLDOWN_SECONDS = 60;

function callableErrorMessage(err: unknown): string {
  if (err instanceof FunctionsError) {
    // The Cloud Function's own messages (rate-limit, "already verified", etc.) are already
    // Korean and user-facing — see functions/src/index.ts — so just relay them as-is.
    return err.message || "인증 메일 전송에 실패했습니다.";
  }
  return "인증 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
}

/**
 * Persistent, globally-visible banner shown whenever the signed-in user is real (non-anonymous)
 * but hasn't verified their email yet. Lives in the layout, below the header — see layout.tsx.
 */
export function EmailVerificationBanner() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  // One-time check (not an ongoing subscription, so a mount-only effect rather than state) for the
  // "auto-send-on-signup failed" flag set by auth-context.tsx's signUpEmail, which can't show a
  // message itself since the login page navigates away as soon as signup resolves.
  useEffect(() => {
    if (!window.sessionStorage.getItem(VERIFICATION_SEND_FAILED_KEY)) return;
    window.sessionStorage.removeItem(VERIFICATION_SEND_FAILED_KEY);
    showToast("가입은 완료되었지만 인증 메일 전송에 실패했습니다. 아래 버튼으로 다시 시도해주세요.", "error");
    // showToast is stable (useCallback in ToastProvider) — fine to omit from deps, this must only
    // ever run once on mount to consume the one-shot sessionStorage flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setCooldownUntil(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const shouldShow = !loading && Boolean(user) && !user!.isAnonymous && !user!.emailVerified;

  async function handleResend() {
    if (sending || remaining > 0) return;
    setSending(true);
    try {
      await sendVerificationEmailCall();
      showToast("인증 메일을 보냈습니다. 받은편지함을 확인해주세요.");
      setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
      setRemaining(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("[email-verification] resend failed", err);
      showToast(callableErrorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  if (!shouldShow) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-[14px] gap-y-[4px] bg-[#fbf3e6] border-b border-[#eadfc7] px-[16px] py-[9px] text-[12.5px] text-[#7a5a1f]">
      <span className="font-medium">이메일 인증이 필요합니다.</span>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending || remaining > 0}
        className="border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[12px] font-semibold px-[11px] py-[4px] rounded-[2px] disabled:opacity-60 cursor-pointer"
      >
        {sending ? "전송 중…" : remaining > 0 ? `재전송 (${remaining}초)` : "인증 메일 재전송"}
      </button>
    </div>
  );
}
