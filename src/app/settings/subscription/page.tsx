"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useProgress } from "@/context/progress-context";
import { updateUserProfile } from "@/lib/profile-client";
import {
  getAuthorEarnings,
  getAuthorSubscriberStats,
  PLATFORM_FEE_RATE,
  type EarningsSummary,
  type SubscriberStats,
} from "@/lib/earnings-client";
import { getPayoutInfo, savePayoutInfo } from "@/lib/payout-client";

function won(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

export default function SubscriptionManagePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { showToast } = useToast();
  const { withProgress } = useProgress();

  const [priceHydrated, setPriceHydrated] = useState(false);
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [payoutHydrated, setPayoutHydrated] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.isAnonymous)) router.replace("/login");
  }, [loading, user, router]);

  // One-time hydration from the profile doc, same guarded pattern as /profile/edit.
  useEffect(() => {
    if (priceHydrated || !profile) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration, guarded by the flag */
    setSubscriptionPrice(profile.subscriptionPrice ? String(profile.subscriptionPrice) : "");
    setPriceHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile, priceHydrated]);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    let cancelled = false;
    // `loadingStats` already starts true — no synchronous reset needed here, only the async
    // resolution below (this effect only ever runs once per real uid in practice).
    Promise.all([getAuthorSubscriberStats(user.uid), getAuthorEarnings(user.uid)])
      .then(([s, e]) => {
        if (cancelled) return;
        setStats(s);
        setEarnings(e);
      })
      .catch((err) => console.error("[settings/subscription] stats load failed", err))
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (payoutHydrated || !user || user.isAnonymous) return;
    let cancelled = false;
    getPayoutInfo(user.uid)
      .then((info) => {
        if (cancelled || !info) return;
        setBankName(info.bankName);
        setAccountNumber(info.accountNumber);
        setAccountHolder(info.accountHolder);
      })
      .catch((err) => console.error("[settings/subscription] payout info load failed", err))
      .finally(() => {
        if (!cancelled) setPayoutHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [payoutHydrated, user]);

  async function handleSavePrice() {
    if (!user) return;
    const trimmed = subscriptionPrice.trim();
    if (trimmed && (!/^\d+$/.test(trimmed) || Number(trimmed) < 1000)) {
      showToast("구독료는 1,000원 이상의 숫자로 입력해주세요.", "error");
      return;
    }
    setSavingPrice(true);
    try {
      await withProgress(() =>
        updateUserProfile(user.uid, { subscriptionPrice: trimmed ? Number(trimmed) : null })
      );
      showToast("구독료가 저장되었습니다.");
    } catch (err) {
      console.error("[settings/subscription] price save failed", err);
      showToast("저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setSavingPrice(false);
    }
  }

  async function handleSavePayout() {
    if (!user) return;
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      showToast("은행·계좌번호·예금주를 모두 입력해주세요.", "error");
      return;
    }
    setSavingPayout(true);
    try {
      await withProgress(() =>
        savePayoutInfo(user.uid, {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
        })
      );
      showToast("정산 계좌 정보가 저장되었습니다.");
    } catch (err) {
      console.error("[settings/subscription] payout save failed", err);
      showToast("저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setSavingPayout(false);
    }
  }

  if (loading || !user || user.isAnonymous) {
    return <div className="px-6 py-16 text-center text-[#9a988f] text-[13px]">불러오는 중…</div>;
  }

  return (
    <section className="px-6 pt-12 pb-[60px] max-w-[600px] mx-auto">
      <h1 className="font-bold text-[26px] tracking-[-0.03em] mb-[8px]">구독 관리하기</h1>
      <p className="text-[13px] text-[#8a887f] mb-[30px]">
        구독료 설정, 구독자 현황, 후원·구독 매출을 한곳에서 관리합니다.
      </p>

      {/* 구독료 설정 */}
      <div className="border border-[#e6e4de] rounded-[8px] p-[20px] mb-[20px]">
        <h2 className="text-[13px] font-semibold text-[#54524c] mb-[12px]">구독료 설정</h2>
        <label className="flex flex-col gap-[6px] mb-[10px]">
          <span className="text-[12.5px] text-[#8a887f]">월 구독료 (원) · 비워두면 구독을 받지 않습니다</span>
          <input
            value={subscriptionPrice}
            onChange={(e) => setSubscriptionPrice(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="예: 5000"
            inputMode="numeric"
            className="w-full text-[14px] font-mono px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
        </label>
        {profile?.subscriptionPrice ? (
          <p className="text-[11.5px] text-[#b0aea6] mb-[12px]">
            가격을 바꿔도 이미 구독 중인 독자의 결제 금액에는 영향이 없습니다.
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSavePrice}
          disabled={savingPrice}
          className="border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13px] font-semibold px-[16px] py-[9px] rounded-[3px] disabled:opacity-60 cursor-pointer"
        >
          {savingPrice ? "저장 중…" : "저장"}
        </button>
      </div>

      {/* 구독자 현황 */}
      <div className="border border-[#e6e4de] rounded-[8px] p-[20px] mb-[20px]">
        <h2 className="text-[13px] font-semibold text-[#54524c] mb-[12px]">구독자 현황</h2>
        {loadingStats ? (
          <p className="text-[12.5px] text-[#9a988f] m-0">불러오는 중…</p>
        ) : (
          <div className="flex gap-[24px]">
            <div>
              <div className="text-[22px] font-bold font-mono">{stats?.active ?? 0}</div>
              <div className="text-[11.5px] text-[#8a887f]">활성 구독자</div>
            </div>
            <div>
              <div className="text-[22px] font-bold font-mono">{stats?.total ?? 0}</div>
              <div className="text-[11.5px] text-[#8a887f]">전체 구독 이력</div>
            </div>
          </div>
        )}
      </div>

      {/* 매출 현황 */}
      <div className="border border-[#e6e4de] rounded-[8px] p-[20px] mb-[20px]">
        <h2 className="text-[13px] font-semibold text-[#54524c] mb-[12px]">매출 현황 (누적)</h2>
        {loadingStats ? (
          <p className="text-[12.5px] text-[#9a988f] m-0">불러오는 중…</p>
        ) : (
          <div className="flex flex-col gap-[8px] text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#8a887f]">후원 매출</span>
              <span className="font-mono">{won(earnings?.totalSupportAmount ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8a887f]">구독 매출</span>
              <span className="font-mono">{won(earnings?.totalSubscriptionAmount ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t border-[#eeece8] pt-[8px] mt-[2px]">
              <span className="text-[#8a887f]">총 매출</span>
              <span className="font-mono">{won(earnings?.totalGross ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8a887f]">플랫폼 수수료 ({Math.round(PLATFORM_FEE_RATE * 100)}%)</span>
              <span className="font-mono text-[#b64a3f]">-{won(earnings?.platformFee ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t border-[#eeece8] pt-[8px] mt-[2px] font-semibold">
              <span>정산 예정액</span>
              <span className="font-mono">{won(earnings?.netPayout ?? 0)}</span>
            </div>
          </div>
        )}
        <p className="text-[11.5px] text-[#b0aea6] mt-[12px] mb-0">
          정산은 등록하신 계좌로 운영자가 매월 수동 지급합니다. 자동 지급 연동 전까지는 참고용 집계입니다.
        </p>
      </div>

      {/* 정산 계좌 정보 */}
      <div className="border border-[#e6e4de] rounded-[8px] p-[20px]">
        <h2 className="text-[13px] font-semibold text-[#54524c] mb-[12px]">정산 계좌 정보</h2>
        <div className="flex flex-col gap-[10px] mb-[12px]">
          <label className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] text-[#8a887f]">은행명</span>
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="예: 국민은행"
              className="w-full text-[14px] px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
            />
          </label>
          <label className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] text-[#8a887f]">계좌번호</span>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
              placeholder="'-' 없이 숫자만 입력해도 됩니다"
              inputMode="numeric"
              className="w-full text-[14px] font-mono px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
            />
          </label>
          <label className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] text-[#8a887f]">예금주</span>
            <input
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="예금주 실명"
              className="w-full text-[14px] px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleSavePayout}
          disabled={savingPayout}
          className="border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13px] font-semibold px-[16px] py-[9px] rounded-[3px] disabled:opacity-60 cursor-pointer"
        >
          {savingPayout ? "저장 중…" : "저장"}
        </button>
        <p className="text-[11.5px] text-[#b0aea6] mt-[12px] mb-0">
          계좌 정보는 정산 목적으로만 사용되며, 본인 외에는 누구도 조회할 수 없습니다.
        </p>
      </div>
    </section>
  );
}
