"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Toss redirects here when the reader cancels card registration or it's rejected — no billing
 * key was ever issued, so there's nothing to clean up. */
function SubscribeFailContent() {
  const params = useSearchParams();
  const message = params.get("message");

  return (
    <section className="min-h-full flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-[352px] text-center flex flex-col items-center gap-[14px]">
        <h1 className="font-bold text-[22px] tracking-[-0.03em]">구독 등록이 완료되지 않았습니다</h1>
        <p className="text-[13.5px] text-[#8a887f] m-0">
          {message || "카드 등록이 취소되었거나 실패했습니다. 원하시면 다시 시도해주세요."}
        </p>
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

export default function SubscribeFailPage() {
  return (
    <Suspense fallback={null}>
      <SubscribeFailContent />
    </Suspense>
  );
}
