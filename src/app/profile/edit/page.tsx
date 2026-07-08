"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Avatar } from "@/components/Avatar";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { updateUserProfile, uploadAvatar, uploadCover } from "@/lib/profile-client";
import { deleteAccountCall } from "@/lib/account-client";
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
  const { user, profile, loading, logout } = useAuth();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  // The raw file the user just picked, waiting to be cropped — `avatarFile` (below) is only ever
  // set to the *cropped* result, never the original pick, so it's always what actually gets
  // uploaded/previewed.
  const [avatarCropSource, setAvatarCropSource] = useState<{ file: File; objectUrl: string } | null>(null);

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
    setSubscriptionPrice(profile.subscriptionPrice ? String(profile.subscriptionPrice) : "");
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
    const trimmedPrice = subscriptionPrice.trim();
    if (trimmedPrice && (!/^\d+$/.test(trimmedPrice) || Number(trimmedPrice) < 1000)) {
      showToast("구독료는 1,000원 이상의 숫자로 입력해주세요.", "error");
      return;
    }
    setSaving(true);
    setAvatarProgress(avatarFile ? 0 : null);
    setCoverProgress(coverFile ? 0 : null);
    try {
      let photoURL: string | null | undefined;
      let coverURL: string | null | undefined;
      if (avatarFile) photoURL = await uploadAvatar(user.uid, avatarFile, setAvatarProgress);
      if (coverFile) coverURL = await uploadCover(user.uid, coverFile, setCoverProgress);

      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        links: {
          website: website.trim(),
          instagram: instagram.trim(),
          twitter: twitter.trim(),
        },
        subscriptionPrice: trimmedPrice ? Number(trimmedPrice) : null,
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
      setAvatarProgress(null);
      setCoverProgress(null);
    }
  }

  function handleAvatarFileSelected(file: File | null) {
    if (!file) return;
    setAvatarCropSource({ file, objectUrl: URL.createObjectURL(file) });
  }

  function closeAvatarCrop() {
    if (avatarCropSource) URL.revokeObjectURL(avatarCropSource.objectUrl);
    setAvatarCropSource(null);
  }

  function handleAvatarCropped(file: File) {
    setAvatarFile(file);
    closeAvatarCrop();
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    const confirmed = window.confirm(
      "정말 탈퇴하시겠습니까? 프로필과 @핸들이 삭제되며 되돌릴 수 없습니다. 이미 작성한 글·댓글은 남아있습니다."
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteAccountCall();
      await logout();
      router.push("/");
    } catch (err) {
      console.error("[profile/edit] account deletion failed", err);
      showToast("회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
      setDeleting(false);
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
          {coverProgress !== null && (
            <div className="h-[3px] bg-[#f0eee9] rounded-full mt-[8px] overflow-hidden">
              <div
                className="h-full bg-[#0e0e0e] transition-[width] duration-150"
                style={{ width: `${coverProgress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-[14px]">
          <Avatar src={effectiveAvatarSrc} name={displayName} size={64} />
          <div className="flex flex-col gap-[6px] flex-1">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-[12.5px] font-medium text-[#0e0e0e] border border-[#e0ded8] bg-white px-[12px] py-[7px] rounded-[3px] cursor-pointer w-fit"
            >
              프로필 사진 변경
            </button>
            {avatarProgress !== null && (
              <div className="h-[3px] bg-[#f0eee9] rounded-full overflow-hidden max-w-[160px]">
                <div
                  className="h-full bg-[#0e0e0e] transition-[width] duration-150"
                  style={{ width: `${avatarProgress}%` }}
                />
              </div>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleAvatarFileSelected(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
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
          <span className="text-[12.5px] text-[#8a887f]">월 구독료 (원) · 비워두면 구독을 받지 않습니다</span>
          <input
            value={subscriptionPrice}
            onChange={(e) => setSubscriptionPrice(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="예: 5000"
            inputMode="numeric"
            className="w-full text-[14px] font-mono px-[14px] py-[11px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
          {profile?.subscriptionPrice ? (
            <p className="text-[11.5px] text-[#b0aea6] m-0">
              가격을 바꿔도 이미 구독 중인 독자의 결제 금액에는 영향이 없습니다.
            </p>
          ) : null}
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

      <div className="mt-[40px] pt-[24px] border-t border-[#eeece8]">
        <h2 className="text-[13px] font-semibold text-[#b64a3f] mb-[8px]">위험 구역</h2>
        <p className="text-[12.5px] text-[#8a887f] mb-[12px] leading-[1.6]">
          계정을 삭제하면 프로필과 @핸들이 사라지며 되돌릴 수 없습니다. 이미 작성한 글과 댓글은 삭제되지 않고 남아있습니다.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="text-[12.5px] font-medium text-[#b64a3f] border border-[#e5c6c1] bg-white px-[14px] py-[9px] rounded-[3px] disabled:opacity-60 cursor-pointer"
        >
          {deleting ? "탈퇴 처리 중…" : "회원 탈퇴"}
        </button>
      </div>

      {avatarCropSource && (
        <AvatarCropModal
          imageSrc={avatarCropSource.objectUrl}
          fileName={avatarCropSource.file.name}
          onCancel={closeAvatarCrop}
          onCropped={handleAvatarCropped}
        />
      )}
    </section>
  );
}
