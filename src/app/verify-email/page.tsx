"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/context/auth-context";

/**
 * This page does NOT itself verify anything — `verifyEmailToken` (functions/src/index.ts) already
 * did the work (checked the token, flipped `emailVerified` to true via the Admin SDK) before
 * redirecting here with `?status=success|error&reason=...`. This page just reads that result and
 * shows a message.
 */
const REASON_MESSAGE: Record<string, string> = {
  "missing-params": "인증 링크가 올바르지 않습니다.",
  "not-found": "인증 요청을 찾을 수 없습니다. 인증 메일을 다시 요청해주세요.",
  expired: "인증 링크가 만료되었습니다. 인증 메일을 다시 요청해주세요.",
  mismatch: "인증 링크가 유효하지 않습니다.",
  unknown: "알 수 없는 오류가 발생했습니다.",
};

function VerifyEmailContent() {
  const params = useSearchParams();
  const { refreshUser } = useAuth();
  const status = params.get("status");
  const reason = params.get("reason");
  const isSuccess = status === "success";
  const [refreshing, setRefreshing] = useState(isSuccess);

  useEffect(() => {
    if (!isSuccess) return;
    // If this browser tab is still signed in as the just-verified user, force an ID token
    // refresh so `email_verified` shows up in security rules immediately, no full re-login
    // needed — then refresh the local user object too so the persistent banner disappears
    // right away instead of on the next natural token refresh.
    //
    // Verifying from a different browser/device than the one you're logged in on is fine and
    // expected to lag: that other session picks up the new claim on its own next natural token
    // refresh (~1hr) or re-login (see SETUP.md).
    let cancelled = false;
    (async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
          await refreshUser();
        } catch (err) {
          console.error("[verify-email] token refresh failed", err);
        }
      }
      if (!cancelled) setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for this status value
  }, [isSuccess]);

  return (
    <section className="min-h-full flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-[352px] text-center flex flex-col items-center gap-[14px]">
        <h1 className="font-bold text-[22px] tracking-[-0.03em]">
          {isSuccess ? "이메일 인증 완료" : "인증에 실패했습니다"}
        </h1>
        <p className="text-[13.5px] text-[#8a887f] m-0">
          {isSuccess
            ? "이메일 인증이 완료되었습니다. 이제 글쓰기와 댓글, 좋아요를 이용할 수 있습니다."
            : (reason && REASON_MESSAGE[reason]) ?? "인증에 실패했습니다. 인증 메일을 다시 요청해주세요."}
        </p>
        {refreshing && <p className="text-[12px] text-[#b0aea6] m-0">로그인 상태를 갱신하는 중…</p>}
        <Link
          href="/"
          className="mt-[6px] border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13.5px] font-semibold px-[18px] py-[10px] rounded-[3px]"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
