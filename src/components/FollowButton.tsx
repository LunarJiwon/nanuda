"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isVerifiedUser } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { followUser, isFollowing, unfollowUser } from "@/lib/follows-client";

/** Free "새 글 알림 받기" toggle, distinct from the paid SubscribeButton — hidden on the author's
 * own profile, same self-guard pattern as SubscribeButton. `onToggle` fires only after a
 * successful create/delete, so a caller (FollowSection) can bump a locally-displayed follower
 * count without subscribing to live Firestore counts. */
export function FollowButton({
  authorId,
  onToggle,
}: {
  authorId: string;
  onToggle?: (nowFollowing: boolean) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.isAnonymous || user.uid === authorId) return;
    let cancelled = false;
    isFollowing(user.uid, authorId)
      .then((value) => {
        if (!cancelled) setFollowing(value);
      })
      .catch((err) => console.error("[follow] status check failed", err));
    return () => {
      cancelled = true;
    };
  }, [authorId, user]);

  if (user && user.uid === authorId) return null;

  async function handleClick() {
    if (!user || user.isAnonymous) {
      router.push("/login");
      return;
    }
    if (!isVerifiedUser(user)) {
      showToast("팔로우하려면 이메일 인증이 필요합니다. 상단 배너에서 인증 메일을 재전송해주세요.", "error");
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(user.uid, authorId);
        setFollowing(false);
        onToggle?.(false);
      } else {
        await followUser(user.uid, authorId);
        setFollowing(true);
        onToggle?.(true);
      }
    } catch (err) {
      console.error("[follow] toggle failed", err);
      showToast("잠시 후 다시 시도해주세요.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      // Same padding in both states (only color/weight/border differ) — a padding mismatch here
      // previously changed the button's own height by a couple pixels on toggle, which rippled
      // into a visible shift of the whole profile header row above it (flex `items-center`
      // recenters everything against the tallest sibling whenever one child's height changes).
      className={
        following
          ? "text-[12.5px] font-medium text-[#54524c] border border-[#e0ded8] bg-[#f7f6f3] px-[13px] py-[7px] rounded-[2px] cursor-pointer disabled:opacity-60"
          : "text-[12.5px] font-semibold text-white bg-[#0e0e0e] border border-[#0e0e0e] px-[13px] py-[7px] rounded-[2px] cursor-pointer disabled:opacity-60"
      }
    >
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
