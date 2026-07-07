"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Avatar } from "@/components/Avatar";
import { reserveHandleAndCreateUser, uploadAvatar } from "@/lib/profile-client";
import { useHandleAvailability, handleStatusMessage } from "@/hooks/useHandleAvailability";
import { useObjectUrlPreview } from "@/hooks/useObjectUrlPreview";

/**
 * Short "프로필 완성" step for Google sign-ups: Google OAuth gives us a name/email/photo but no
 * `@handle`/bio, so a user whose `users/{uid}` doc doesn't exist yet (or has no handle) lands
 * here before being let into the rest of the app. See Header.tsx / login page for the redirect.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { showToast } = useToast();
  const [bio, setBio] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { handle: normalizedHandle, status: handleStatus } = useHandleAvailability(handleInput, true);
  const handleStatusInfo = handleStatusMessage(handleStatus, normalizedHandle);
  const canSubmit = handleStatus === "available";
  const avatarPreview = useObjectUrlPreview(avatarFile);

  useEffect(() => {
    if (loading) return;
    if (!user || user.isAnonymous) {
      router.replace("/login");
      return;
    }
    // Already has a public profile — nothing to onboard.
    if (profile?.handle) router.replace("/");
  }, [loading, user, profile, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSubmitting(true);
    try {
      let photoURL = user.photoURL ?? null;
      if (avatarFile) photoURL = await uploadAvatar(user.uid, avatarFile);
      await reserveHandleAndCreateUser({
        uid: user.uid,
        handle: normalizedHandle,
        displayName: user.displayName ?? "",
        email: user.email ?? null,
        photoURL,
        bio: bio.trim(),
      });
      // Same as the email/password signup path: land on the fresh profile with the
      // welcome/tutorial banner instead of home.
      router.push(`/profile/${normalizedHandle}?welcome=1`);
    } catch (err) {
      console.error("[onboarding] failed", err);
      showToast(err instanceof Error ? err.message : "프로필 저장에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || user.isAnonymous || profile?.handle) {
    return <div className="px-6 py-16 text-center text-[#9a988f] text-[13px]">불러오는 중…</div>;
  }

  return (
    <section className="min-h-full flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-[352px]">
        <div className="flex flex-col items-center mb-[30px]">
          <h1 className="font-bold text-[24px] tracking-[-0.03em] mb-[6px]">프로필 완성하기</h1>
          <p className="text-[13.5px] text-[#8a887f] m-0 text-center">
            나누다에서 사용할 핸들과 소개를 설정해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
          <div className="flex items-center gap-[12px] mb-[2px]">
            <Avatar src={avatarPreview ?? user.photoURL} name={user.displayName} size={52} />
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[12.5px] font-medium text-[#0e0e0e] border border-[#e0ded8] bg-white px-[12px] py-[6px] rounded-[3px] cursor-pointer w-fit"
              >
                프로필 사진 변경
              </button>
              <span className="text-[11px] text-[#9a988f]">선택하지 않으면 Google 프로필 사진을 사용합니다.</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-center border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] focus-within:border-[#c2c0b8]">
              <span className="pl-[14px] text-[14px] text-[#9a988f] font-mono">@</span>
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                placeholder="handle"
                required
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full text-[14px] font-mono px-[6px] py-[12px] bg-transparent text-[#0e0e0e] outline-none"
              />
            </div>
            {handleStatusInfo && (
              <span className={`text-[11.5px] ${handleStatusInfo.color}`}>{handleStatusInfo.text}</span>
            )}
          </div>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="한 줄 소개 (선택)"
            maxLength={80}
            className="w-full text-[14px] px-[14px] py-[12px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full mt-[4px] border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[14px] font-semibold py-[12px] rounded-[3px] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "저장 중…" : "시작하기"}
          </button>
        </form>
      </div>
    </section>
  );
}
