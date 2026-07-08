"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isVerifiedUser } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { startSupportPayment, SUPPORT_AMOUNTS, type SupportAmount } from "@/lib/support-client";

/**
 * Reader→writer 응원(tip) button, shown near LikeButton on a post's detail page. Hidden entirely
 * on the author's own post (no self-tipping — also enforced in firestore.rules). Requires a
 * verified email to actually pay, same gating as liking/commenting.
 */
export function SupportButton({
  postId,
  postTitle,
  authorId,
  authorName,
}: {
  postId: string;
  postTitle: string;
  authorId: string;
  authorName: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<SupportAmount>(3000);
  const [submitting, setSubmitting] = useState(false);

  if (user && user.uid === authorId) return null;

  function handleOpen() {
    if (!user || user.isAnonymous) {
      router.push("/login");
      return;
    }
    if (!isVerifiedUser(user)) {
      showToast("응원하려면 이메일 인증이 필요합니다. 상단 배너에서 인증 메일을 재전송해주세요.", "error");
      return;
    }
    setOpen(true);
  }

  async function handleConfirm() {
    if (!user) return;
    setSubmitting(true);
    try {
      await startSupportPayment({
        postId,
        postTitle,
        authorId,
        authorName,
        supporterId: user.uid,
        supporterName: user.displayName || user.email || "익명",
        amount,
      });
      // On success this redirects the browser to Toss's payment window and never returns here —
      // reaching this line means the user closed it without completing anything.
    } catch (err) {
      console.error("[support] payment start failed", err);
      showToast("결제를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-[5px] text-[12.5px] px-[10px] py-[4px] rounded-[2px] border border-[#e0ded8] bg-white text-[#54524c] cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M2 12h20" />
        </svg>
        응원하기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center px-6"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-[320px] bg-white rounded-[6px] border border-[#e6e4de] p-[22px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-[16px] tracking-[-0.02em] mb-[4px]">이 글을 응원해보세요</h3>
            <p className="text-[12.5px] text-[#8a887f] mb-[16px]">{authorName} 님에게 응원 금액이 전달됩니다.</p>
            <div className="grid grid-cols-2 gap-[8px] mb-[18px]">
              {SUPPORT_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={`text-[13.5px] font-medium py-[10px] rounded-[3px] border cursor-pointer ${
                    amount === a ? "border-[#0e0e0e] bg-[#0e0e0e] text-white" : "border-[#e0ded8] bg-white text-[#0e0e0e]"
                  }`}
                >
                  {a.toLocaleString()}원
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[14px] font-semibold py-[11px] rounded-[3px] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "이동 중…" : `${amount.toLocaleString()}원 응원하기`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
