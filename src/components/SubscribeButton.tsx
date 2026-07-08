"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isVerifiedUser } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useConfirm } from "@/context/confirm-context";
import {
  cancelSubscriptionCall,
  getMySubscription,
  startSubscriptionPayment,
  type SubscriptionStatus,
} from "@/lib/subscription-client";
import { TOSS_ENABLED } from "@/lib/toss";

/** Shown on an author's profile when they've set a subscriptionPrice. Hidden entirely on the
 * author's own profile — same self-subscribe guard as SupportButton, enforced again server-side
 * in confirmSubscription. */
export function SubscribeButton({
  authorId,
  authorName,
  price,
}: {
  authorId: string;
  authorName: string;
  price: number;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  // Whether currentPeriodEnd is still in the future — computed once per fetch (inside the effect's
  // async callback, where reading the clock is fine) rather than at render time, since render
  // must stay pure (no Date.now() there).
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!TOSS_ENABLED || !user || user.isAnonymous || user.uid === authorId) return;
    let cancelled = false;
    getMySubscription(authorId, user.uid)
      .then((sub) => {
        if (cancelled) return;
        setSubscription(sub);
        setHasAccess(Boolean(sub && sub.currentPeriodEnd.getTime() > Date.now()));
      })
      .catch((err) => console.error("[subscription] status check failed", err));
    return () => {
      cancelled = true;
    };
  }, [authorId, user]);

  // Self-subscribing makes no sense, so the actual button never renders here — but silently
  // showing nothing at all reads as "the subscription feature is broken" to the author looking at
  // their own profile, so show a passive confirmation label instead. Styled and gated the same as
  // the 구독하기/응원하기 buttons below (see TOSS_ENABLED) rather than as a plain text link, since it
  // sits right next to those pill-shaped buttons on the profile page.
  if (user && user.uid === authorId) {
    return (
      <button
        type="button"
        onClick={() => showToast("구독 관리하기는 준비 중입니다. 조금만 기다려주세요.")}
        className="text-[12.5px] font-medium text-[#b0aea6] border border-[#e0ded8] bg-white px-[13px] py-[7px] rounded-[2px] cursor-pointer"
      >
        구독 관리하기
      </button>
    );
  }

  if (!TOSS_ENABLED) {
    return (
      <button
        type="button"
        onClick={() => showToast("구독하기는 준비 중입니다. 조금만 기다려주세요.")}
        className="text-[12.5px] font-medium text-[#b0aea6] border border-[#e0ded8] bg-white px-[13px] py-[7px] rounded-[2px] cursor-pointer"
      >
        구독하기 · 준비중
      </button>
    );
  }

  async function handleSubscribe() {
    if (!user || user.isAnonymous) {
      router.push("/login");
      return;
    }
    if (!isVerifiedUser(user)) {
      showToast("구독하려면 이메일 인증이 필요합니다. 상단 배너에서 인증 메일을 재전송해주세요.", "error");
      return;
    }
    setLoading(true);
    try {
      await startSubscriptionPayment({
        authorId,
        authorName,
        subscriberId: user.uid,
        subscriberName: user.displayName || user.email || "익명",
      });
      // On success this redirects to Toss's card-registration window and never returns here.
    } catch (err) {
      console.error("[subscription] start failed", err);
      showToast("구독을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!user || loading) return;
    const confirmed = await confirm(
      "구독을 취소하시겠습니까? 이미 결제한 기간이 끝날 때까지는 계속 이용할 수 있습니다.",
      { confirmLabel: "구독 취소", danger: true }
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      await cancelSubscriptionCall(authorId);
      const updated = await getMySubscription(authorId, user.uid);
      setSubscription(updated);
      setHasAccess(Boolean(updated && updated.currentPeriodEnd.getTime() > Date.now()));
      showToast("구독이 취소되었습니다.");
    } catch (err) {
      console.error("[subscription] cancel failed", err);
      showToast("구독 취소에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (hasAccess) {
    const isCanceled = subscription!.status === "canceled";
    return (
      <button
        type="button"
        onClick={isCanceled ? undefined : handleCancel}
        disabled={loading}
        title={
          isCanceled
            ? `${subscription!.currentPeriodEnd.toLocaleDateString("ko-KR")}까지 이용 가능`
            : "클릭하면 구독을 취소합니다"
        }
        className="text-[12.5px] font-medium text-[#54524c] border border-[#e0ded8] bg-[#f7f6f3] px-[13px] py-[7px] rounded-[2px] cursor-pointer disabled:opacity-60"
      >
        {isCanceled ? "구독 취소됨" : "구독 중"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      className="text-[12.5px] font-semibold text-white bg-[#0e0e0e] border border-[#0e0e0e] px-[13px] py-[7px] rounded-[2px] cursor-pointer disabled:opacity-60"
    >
      {loading ? "이동 중…" : `구독하기 · 월 ${price.toLocaleString()}원`}
    </button>
  );
}
