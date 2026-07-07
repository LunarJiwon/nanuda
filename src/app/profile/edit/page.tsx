"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Avatar } from "@/components/Avatar";
import { updateUserProfile, uploadAvatar, uploadCover } from "@/lib/profile-client";
import { useObjectUrlPreview } from "@/hooks/useObjectUrlPreview";

/** A field is valid if empty (all three link fields are optional) or looks like an http(s) URL. */
function isValidOptionalUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarPreview = useObjectUrlPreview(avatarFile);
  const coverPreview = useObjectUrlPreview(coverFile);

  useEffect(() => {
    if (!loading && (!user || user.isAnonymous)) router.replace("/login");
  }, [loading, user, router]);

  // Seed the form from the live profile doc once it arrives (only once, so the user's in-progress
  // edits aren't clobbered by the onSnapshot listener firing again after their own save). This is
  // a genuine one-time "hydrate local editable state from an async doc" case, not a derivable
  // value, so it can't be expressed as useMemo like the object-URL previews above — hence the
  // scoped lint exception.
  useEffect(() => {
    if (hydrated || !profile) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from the profile doc,
       guarded by `hydrated` so it never re-fires and clobbers in-progress edits. */
    setDisplayName(profile.displayName || "");
    setBio(profile.bio || "");
    setWebsite(profile.links?.website || "");
    setInstagram(profile.links?.instagram || "");
    setTwitter(profile.links?.twitter || "");
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile, hydrated]);

  const linksValid =
    isValidOptionalUrl(website) && isValidOptionalUrl(instagram) && isValidOptionalUrl(twitter);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!linksValid) {
      showToast("링크는 http(s):// 로 시작하는 올바른 URL 형식이어야 합니다.", "error");
      return;
    }
    setSaving(true);
    try {
      let photoURL: string | null | undefined;
      let coverURL: string | null | undefined;
      if (avatarFile) photoURL = await uploadAvatar(user.uid, avatarFile);
      if (coverFile) coverURL = await uploadCover(user.uid, coverFile);

      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        links: {
          website: website.trim(),
          instagram: instagram.trim(),
          twitter: twitter.trim(),
        },
        ...(photoURL !== undefined ? { photoURL } : {}),
        ...(coverURL !== undefined ? { coverURL } : {}),
      });
      showToast("저장되었습니다.");
      setAvatarFile(null);
      setCoverFile(null);
    } catch (err) {
      console.error("[profile/edit] save failed", err);
      showToast("저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.isAnonymous) {
    return <div className="px-6 py-16 text-center text-[#9a988f] text-[13px]">불러오는 중…</div>;
  }

  const effectiveAvatarSrc = avatarPreview ?? profile?.photoURL ?? user.photoURL;
  const effectiveCoverSrc = coverPreview ?? profile?.coverURL ?? null;

  return (
    <section className="px-6 pt-12 pb-[60px] max-w-[600px] mx-auto">
      <h1 className="font-bold text-[28px] tracking-[-0.03em] mb-[26px]">프로필 편집</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div>
          <label className="block text-[12.5px] text-[#8a887f] mb-[8px]">커버 이미지</label>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="w-full h-[120px] rounded-[6px] border border-[#e0ded8] bg-[#f2f0ec] overflow-hidden bg-cover bg-center cursor-pointer"
            style={effectiveCoverSrc ? { backgroundImage: `url(${effectiveCoverSrc})` } : undefined}
          >
            {!effectiveCoverSrc && (
              <span className="text-[12.5px] text-[#9a988f]">커버 이미지 선택</span>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex items-center gap-[14px]">
          <Avatar src={effectiveAvatarSrc} name={displayName} size={64} />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="text-[12.5px] font-medium text-[#0e0e0e] border border-[#e0ded8] bg-white px-[12px] py-[7px] rounded-[3px] cursor-pointer"
          >
            프로필 사진 변경
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {profile?.handle && (
          <p className="text-[12.5px] text-[#8a887f] -mt-[10px]">
            @{profile.handle} · 핸들은 변경할 수 없습니다.
          </p>
        )}

        <label className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] text-[#8a887f]">이름</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full text-[14px] px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
        </label>

        <label className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] text-[#8a887f]">소개</span>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={80}
            placeholder="한 줄 소개"
            className="w-full text-[14px] px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
        </label>

        <label className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] text-[#8a887f]">웹사이트</span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full text-[14px] font-mono px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
        </label>

        <label className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] text-[#8a887f]">Instagram</span>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/handle"
            className="w-full text-[14px] font-mono px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
        </label>

        <label className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] text-[#8a887f]">Twitter / X</span>
          <input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="https://x.com/handle"
            className="w-full text-[14px] font-mono px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[14px] font-semibold py-[12px] rounded-[3px] disabled:opacity-60 cursor-pointer"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </form>
    </section>
  );
}
