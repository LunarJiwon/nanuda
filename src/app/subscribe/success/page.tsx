"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmSubscriptionCall } from "@/lib/subscription-client";
import { getUserProfileOnce } from "@/lib/profile-client";

/**
 * Toss redirects here after the reader registers a card in its hosted window — see
 * startSubscriptionPayment in subscription-client.ts. Registering a card isn't a completed
 * subscription yet; confirmSubscriptionCall below is what actually issues the billing key and
 * charges the first period.
 */
function SubscribeSuccessContent() {
  const params = useSearchParams();
  const authorId = params.get("authorId");
  const authKey = params.get("authKey");
  const customerKey = params.get("customerKey");
  const hasParams = Boolean(authorId && authKey && customerKey);

  const [status, setStatus] = useState<"confirming" | "success" | "error">(hasParams ? "confirming" : "error");
  const [authorHandle, setAuthorHandle] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!hasParams || ranRef.current) return;
    ranRef.current = true;

    confirmSubscriptionCall({ authorId: authorId!, authKey: authKey!, customerKey: customerKey! })
      .then(() => getUserProfileOnce(authorId!))
      .then((author) => {
        setAuthorHandle(author?.handle ?? null);
        setStatus("success");
      })
      .catch((err) => {
        console.error("[subscribe/success] confirm failed", err);
        setStatus("error");
      });
  }, [hasParams, authorId, authKey, customerKey]);

  return (
    <section className="min-h-full flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-[352px] text-center flex flex-col items-center gap-[14px]">
        <h1 className="font-bold text-[22px] tracking-[-0.03em]">
          {status === "confirming" && "구독 확인 중…"}
          {status === "success" && "구독이 시작되었습니다"}
          {status === "error" && "구독 확인에 실패했습니다"}
        </h1>
        <p className="text-[13.5px] text-[#8a887f] m-0">
          {status === "confirming" && "잠시만 기다려주세요."}
          {status === "success" && "매달 자동으로 결제되며, 언제든 구독을 취소할 수 있습니다."}
          {status === "error" && "결제가 완료되지 않았을 수 있습니다. 문제가 계속되면 문의해주세요."}
        </p>
        <Link
          href={authorHandle ? `/profile/${authorHandle}` : "/"}
          className="mt-[6px] border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13.5px] font-semibold px-[18px] py-[10px] rounded-[3px]"
        >
          {authorHandle ? "작가 프로필로 돌아가기" : "홈으로 돌아가기"}
        </Link>
      </div>
    </section>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SubscribeSuccessContent />
    </Suspense>
  );
}
