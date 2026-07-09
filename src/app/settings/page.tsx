"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useProgress } from "@/context/progress-context";
import { updateUserProfile } from "@/lib/profile-client";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { showToast } = useToast();
  const { withProgress } = useProgress();

  const [commentNotif, setCommentNotif] = useState(true);
  const [likeNotif, setLikeNotif] = useState(true);
  const [newPostNotif, setNewPostNotif] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.isAnonymous)) router.replace("/login");
  }, [loading, user, router]);

  // One-time hydration from the profile doc once it arrives, same pattern as /profile/edit —
  // guarded by `hydrated` so the live onSnapshot listener never clobbers an in-progress toggle.
  useEffect(() => {
    if (hydrated || !profile) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration, guarded by `hydrated` */
    setCommentNotif(profile.notificationSettings?.comment !== false);
    setLikeNotif(profile.notificationSettings?.like !== false);
    setNewPostNotif(profile.notificationSettings?.newPost !== false);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile, hydrated]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await withProgress(() =>
        updateUserProfile(user.uid, {
          notificationSettings: { comment: commentNotif, like: likeNotif, newPost: newPostNotif },
        })
      );
      showToast("설정이 저장되었습니다.");
    } catch (err) {
      console.error("[settings] save failed", err);
      showToast("설정 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.isAnonymous) {
    return <div className="px-6 py-16 text-center text-[#9a988f] text-[13px]">불러오는 중…</div>;
  }

  return (
    <section className="px-6 pt-12 pb-[60px] max-w-[560px] mx-auto">
      <h1 className="font-bold text-[26px] tracking-[-0.03em] mb-[26px]">설정</h1>

      <h2 className="text-[13px] font-semibold text-[#54524c] mb-[12px]">알림</h2>
      <div className="flex flex-col gap-[10px] mb-[30px]">
        <label className="flex items-center justify-between gap-[12px] border border-[#e6e4de] rounded-[6px] px-[16px] py-[14px] cursor-pointer">
          <span className="flex flex-col gap-[2px]">
            <span className="text-[14px] text-[#0e0e0e]">댓글 · 답글 알림</span>
            <span className="text-[12px] text-[#8a887f]">
              내 게시글에 댓글이 달리거나, 내 댓글에 답글이 달리면 알려드립니다.
            </span>
          </span>
          <input
            type="checkbox"
            checked={commentNotif}
            onChange={(e) => setCommentNotif(e.target.checked)}
            className="w-[18px] h-[18px] cursor-pointer accent-[#0e0e0e] flex-none"
          />
        </label>
        <label className="flex items-center justify-between gap-[12px] border border-[#e6e4de] rounded-[6px] px-[16px] py-[14px] cursor-pointer">
          <span className="flex flex-col gap-[2px]">
            <span className="text-[14px] text-[#0e0e0e]">좋아요 알림</span>
            <span className="text-[12px] text-[#8a887f]">내 게시글에 좋아요가 눌리면 알려드립니다.</span>
          </span>
          <input
            type="checkbox"
            checked={likeNotif}
            onChange={(e) => setLikeNotif(e.target.checked)}
            className="w-[18px] h-[18px] cursor-pointer accent-[#0e0e0e] flex-none"
          />
        </label>
        <label className="flex items-center justify-between gap-[12px] border border-[#e6e4de] rounded-[6px] px-[16px] py-[14px] cursor-pointer">
          <span className="flex flex-col gap-[2px]">
            <span className="text-[14px] text-[#0e0e0e]">새 글 알림</span>
            <span className="text-[12px] text-[#8a887f]">팔로우한 작가가 새 글을 올리면 알려드립니다.</span>
          </span>
          <input
            type="checkbox"
            checked={newPostNotif}
            onChange={(e) => setNewPostNotif(e.target.checked)}
            className="w-[18px] h-[18px] cursor-pointer accent-[#0e0e0e] flex-none"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[14px] font-semibold px-[20px] py-[11px] rounded-[3px] disabled:opacity-60 cursor-pointer"
      >
        {saving ? "저장 중…" : "저장"}
      </button>
    </section>
  );
}
