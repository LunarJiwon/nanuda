"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Shown once, right after signup, on the new user's own /profile/[handle]?welcome=1 (see the
 * redirect at the end of signUpEmail's caller in login/page.tsx and onboarding/page.tsx). Doubles
 * as the "가입 완료" confirmation and a two-step tutorial pointing at the two things a brand-new
 * account can't do yet: a filled-out profile and a first post. Dismissing strips the query param
 * (via router.replace, no history entry) so it doesn't come back on refresh or a later visit.
 *
 * Must be rendered inside a <Suspense> boundary — useSearchParams() requires it, and without one
 * Next.js would de-opt the whole (otherwise static) profile page to fully dynamic rendering.
 */
export function ProfileWelcomeTutorial() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if (searchParams.get("welcome") !== "1") return null;

  function dismiss() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="border border-[#e8e7e3] bg-[#faf9f7] rounded-[3px] px-[20px] py-[18px] mb-[26px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em] m-0">나누다에 오신 것을 환영합니다</p>
          <p className="text-[13px] text-[#6b695f] leading-[1.6] mt-[4px] mb-0">
            계정이 만들어졌어요. 아래 두 가지부터 시작해보세요.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="text-[#a9a79e] text-[14px] leading-none border-none bg-none cursor-pointer px-[2px] py-[2px]"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-[8px] mt-[14px]">
        <Link
          href="/profile/edit"
          className="text-[12.5px] font-semibold text-white bg-[#0e0e0e] border border-[#0e0e0e] px-[13px] py-[8px] rounded-[3px]"
        >
          ① 프로필 꾸미기 →
        </Link>
        <Link
          href="/editor"
          className="text-[12.5px] font-medium text-[#0e0e0e] bg-white border border-[#e0ded8] px-[13px] py-[8px] rounded-[3px]"
        >
          ② 첫 글 쓰기 →
        </Link>
      </div>
    </div>
  );
}
