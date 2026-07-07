"use client";

import { useEffect, useState } from "react";
import { isHandleAvailable } from "@/lib/profile-client";
import { isClaimableHandle, isReservedHandle } from "@/lib/handle";

export type HandleStatus = "idle" | "checking" | "available" | "taken" | "invalid";

/**
 * Debounced real-time `@handle` availability check against the `handles/{handle}` collection,
 * shared by the signup form (/login) and /onboarding.
 */
export function useHandleAvailability(rawHandle: string, enabled: boolean) {
  const [status, setStatus] = useState<HandleStatus>("idle");
  const handle = rawHandle.trim().toLowerCase();

  useEffect(() => {
    // Named helper (rather than direct calls in the effect body) so the synchronous
    // idle/invalid/checking transitions below run as part of a callback, matching the debounced
    // check further down.
    function applyImmediateStatus(): boolean {
      if (!handle) {
        setStatus("idle");
        return true;
      }
      if (!isClaimableHandle(handle)) {
        setStatus("invalid");
        return true;
      }
      setStatus("checking");
      return false;
    }

    if (!enabled) return;
    if (applyImmediateStatus()) return;

    const timer = setTimeout(async () => {
      try {
        const available = await isHandleAvailable(handle);
        setStatus(available ? "available" : "taken");
      } catch (err) {
        console.error("[handle] availability check failed", err);
        setStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [handle, enabled]);

  return { handle, status };
}

export function handleStatusMessage(status: HandleStatus, handle: string): { text: string; color: string } | null {
  if (!handle) return null;
  switch (status) {
    case "checking":
      return { text: "확인 중…", color: "text-[#9a988f]" };
    case "available":
      return { text: "사용 가능", color: "text-[#3a7d5c]" };
    case "taken":
      return { text: "이미 사용 중", color: "text-[#b64a3f]" };
    case "invalid":
      return isReservedHandle(handle)
        ? { text: "사용할 수 없는 핸들입니다", color: "text-[#b64a3f]" }
        : { text: "영문 소문자, 숫자, _ 3~20자", color: "text-[#b64a3f]" };
    default:
      return null;
  }
}
