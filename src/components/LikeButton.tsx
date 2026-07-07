"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isRealUser, isVerifiedUser } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { hasLiked, toggleLike } from "@/lib/likes-client";

/**
 * Like toggle shown near the post meta row. Requires a real, non-anonymous signed-in user —
 * same gating as comments; clicking while logged out/anonymous routes to /login instead of
 * silently failing. *Liking* (not unliking) additionally requires a verified email
 * (firestore.rules' `isVerifiedUser()` on `likes/{uid}` create) — checked here first so an
 * unverified real user gets a clear inline message instead of a silent rules rejection.
 */
export function LikeButton({ postId, initialLikeCount }: { postId: string; initialLikeCount: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);

  const canLike = isRealUser(user);
  const canCreateLike = isVerifiedUser(user);

  useEffect(() => {
    let cancelled = false;
    // Named async helper (rather than inline logic) so the "reset to not-liked" branch below
    // runs as part of a callback, not synchronously in the effect body.
    async function syncLikedState() {
      if (!canLike || !user) {
        if (!cancelled) setLiked(false);
        return;
      }
      try {
        const v = await hasLiked(postId, user.uid);
        if (!cancelled) setLiked(v);
      } catch (err) {
        console.error("[likes] initial state check failed", err);
      }
    }
    syncLikedState();
    return () => {
      cancelled = true;
    };
  }, [postId, user, canLike]);

  async function handleClick() {
    if (!canLike || !user) {
      router.push("/login");
      return;
    }
    // Unliking (delete) doesn't need verification, only creating a new like does — see the
    // firestore.rules comment on `likes/{uid}`.
    if (!liked && !canCreateLike) {
      showToast("좋아요를 누르려면 이메일 인증이 필요합니다. 상단 배너에서 인증 메일을 재전송해주세요.", "error");
      return;
    }
    if (busy) return;
    setBusy(true);
    // Optimistic update, reconciled below (or rolled back on failure).
    const prevLiked = liked;
    setLiked(!prevLiked);
    setCount((c) => c + (prevLiked ? -1 : 1));
    try {
      const nowLiked = await toggleLike(postId, user.uid);
      setLiked(nowLiked);
    } catch (err) {
      console.error("[likes] toggle failed", err);
      setLiked(prevLiked);
      setCount((c) => c + (prevLiked ? 1 : -1));
      showToast("좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={liked}
      className={`inline-flex items-center gap-[5px] text-[12.5px] px-[10px] py-[4px] rounded-[2px] border cursor-pointer disabled:opacity-60 ${
        liked ? "border-[#0e0e0e] bg-[#0e0e0e] text-white" : "border-[#e0ded8] bg-white text-[#54524c]"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
      </svg>
      <span className="font-mono">{count}</span>
    </button>
  );
}
