"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmSupportPayment } from "@/lib/support-client";

/**
 * Toss redirects here after the buyer completes payment in its hosted window — see
 * startSupportPayment in support-client.ts. This does NOT mean the charge is captured yet; that
 * only happens once confirmSupportPayment's Cloud Function call below succeeds. Never render this
 * page's "성공" state from the redirect alone.
 */
function SupportSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const paymentKey = params.get("paymentKey");
  const amount = params.get("amount");
  const hasParams = Boolean(orderId && paymentKey && amount);

  const [status, setStatus] = useState<"confirming" | "success" | "error">(hasParams ? "confirming" : "error");
  const [postId, setPostId] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!hasParams || ranRef.current) return; // StrictMode/re-render guard — confirm must only run once.
    ranRef.current = true;

    confirmSupportPayment({ orderId: orderId!, paymentKey: paymentKey!, amount: Number(amount) })
      .then((res) => {
        setPostId(res.postId);
        setStatus("success");
      })
      .catch((err) => {
        console.error("[support/success] confirm failed", err);
        setStatus("error");
      });
  }, [hasParams, orderId, paymentKey, amount]);

  return (
    <section className="min-h-full flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-[352px] text-center flex flex-col items-center gap-[14px]">
        <h1 className="font-bold text-[22px] tracking-[-0.03em]">
          {status === "confirming" && "결제 확인 중…"}
          {status === "success" && "응원해주셔서 감사합니다"}
          {status === "error" && "결제 확인에 실패했습니다"}
        </h1>
        <p className="text-[13.5px] text-[#8a887f] m-0">
          {status === "confirming" && "잠시만 기다려주세요."}
          {status === "success" && "작가에게 소중한 응원이 전달됩니다."}
          {status === "error" && "결제가 완료되지 않았을 수 있습니다. 문제가 계속되면 문의해주세요."}
        </p>
        <Link
          href={postId ? `/post/${postId}` : "/"}
          className="mt-[6px] border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13.5px] font-semibold px-[18px] py-[10px] rounded-[3px]"
        >
          {postId ? "게시글로 돌아가기" : "홈으로 돌아가기"}
        </Link>
      </div>
    </section>
  );
}

export default function SupportSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SupportSuccessContent />
    </Suspense>
  );
}
