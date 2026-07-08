"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Avatar } from "./Avatar";
import { LogoMark } from "./LogoMark";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/daily", label: "일상" },
  { href: "/info", label: "정보" },
  { href: "/art", label: "예술" },
  { href: "/quote", label: "글귀" },
  { href: "/archive", label: "전체" },
  { href: "/about", label: "소개" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
  const { showToast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  // Every visitor (including guests) gets a stable anonymous Firebase user for view-count/like
  // dedup — so "logged in" for UI purposes means a real, non-anonymous account. See auth-context.
  const loggedIn = !loading && !!user && !user.isAnonymous;
  // Same fallback the old hardcoded-initials version used (name, else email) — Avatar itself only
  // falls back to a generic placeholder, not email, so that fallback is applied here instead.
  const avatarName = user?.displayName || user?.email;

  const closeProfile = () => setProfileOpen(false);

  const handleLogout = async () => {
    await logout();
    closeProfile();
    showToast("로그아웃되었습니다.");
    router.push("/");
  };

  // Closing the dropdown on an outside click needs a real document listener, not the old
  // "fixed inset-0 overlay button" trick — this header has backdrop-blur (backdrop-filter),
  // which per spec makes the header the *containing block* for any `position: fixed` descendant.
  // That silently shrank the old overlay down to the header's own 62px strip instead of the full
  // viewport, so clicking anywhere in the actual page body never closed the menu.
  useEffect(() => {
    if (!profileOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (profileMenuRef.current?.contains(target)) return;
      if (profileButtonRef.current?.contains(target)) return;
      setProfileOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [profileOpen]);

  return (
    <>
      {/* ============ DESKTOP TOP NAV ============ */}
      <header className="hidden lg:flex relative flex-none items-center justify-between h-[62px] px-[28px] border-b border-[#e8e7e3] bg-white/90 backdrop-blur-[8px] z-20">
        <Link href="/" className="flex items-center gap-[10px]">
          <LogoMark className="w-[26px] h-[26px]" />
          <span className="font-bold text-[16px] tracking-[-0.02em]">나누다</span>
        </Link>
        <nav className="flex items-center gap-[1px]">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative font-medium text-[14px] text-[#0e0e0e] px-[11px] py-[8px]"
              >
                {item.label}
                {active && (
                  <span className="absolute left-[11px] right-[11px] bottom-[2px] h-[2px] bg-[#0e0e0e]" />
                )}
              </Link>
            );
          })}
          <Link
            href="/editor"
            className="ml-[8px] border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13px] font-semibold px-[16px] py-[8px] rounded-[2px] whitespace-nowrap flex-none"
          >
            글쓰기
          </Link>
          {loading && (
            // -mt-px matches the logged-in avatar button below so swapping from this skeleton to
            // the real avatar once auth resolves doesn't visibly shift by that 1px correction.
            <span
              className="ml-[12px] -mt-px w-[32px] h-[32px] rounded-full bg-[#efeee9] animate-pulse"
              aria-hidden
            />
          )}
          {!loading && !loggedIn && (
            <Link
              href="/login"
              className="ml-[8px] border border-[#e0ded8] bg-white text-[#0e0e0e] text-[13px] font-medium px-[14px] py-[8px] rounded-[2px]"
            >
              로그인
            </Link>
          )}
          {loggedIn && (
            <button
              ref={profileButtonRef}
              onClick={() => setProfileOpen((v) => !v)}
              // Mathematically centered against the 글쓰기 button already (same flex row,
              // items-center), but a circle sitting next to a hard-edged rectangle reads as
              // sitting slightly low even when its bounding box is perfectly centered — a common
              // optical-alignment correction, not a layout bug.
              className="ml-[12px] -mt-px rounded-full cursor-pointer"
              aria-label="프로필 메뉴"
            >
              <Avatar src={profile?.photoURL} name={avatarName} size={32} />
            </button>
          )}
        </nav>

        {profileOpen && loggedIn && (
          <div
            ref={profileMenuRef}
            className="absolute top-[56px] right-[24px] z-40 w-[220px] border border-[#e6e4de] bg-white rounded-[8px] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.3)] p-[8px]"
          >
            <div className="flex items-center gap-[10px] px-[8px] pt-[8px] pb-[12px] border-b border-[#f0eee9]">
              <Avatar src={profile?.photoURL} name={avatarName} size={38} />
              <span className="flex flex-col min-w-0">
                <span className="text-[14px] font-semibold truncate">{user?.displayName || "이름 없음"}</span>
                <span className="text-[12px] text-[#8a887f] truncate">{user?.email}</span>
              </span>
            </div>
            <Link
              href="/editor"
              onClick={closeProfile}
              className="block w-full text-left text-[13.5px] text-[#0e0e0e] px-[8px] py-[9px] rounded-[5px] hover:bg-[#f4f2ee]"
            >
              내 글 쓰기
            </Link>
            <Link
              href="/archive"
              onClick={closeProfile}
              className="block w-full text-left text-[13.5px] text-[#0e0e0e] px-[8px] py-[9px] rounded-[5px] hover:bg-[#f4f2ee]"
            >
              내 기록 보기
            </Link>
            <Link
              href="/profile/edit"
              onClick={closeProfile}
              className="block w-full text-left text-[13.5px] text-[#0e0e0e] px-[8px] py-[9px] rounded-[5px] hover:bg-[#f4f2ee]"
            >
              프로필 편집
            </Link>
            {/* Accounts created before handles existed (or a Google sign-up that hasn't
                finished /onboarding) have no public profile yet — route there instead of a
                broken /profile/undefined link. */}
            <Link
              href={profile?.handle ? `/profile/${profile.handle}` : "/onboarding"}
              onClick={closeProfile}
              className="block w-full text-left text-[13.5px] text-[#0e0e0e] px-[8px] py-[9px] rounded-[5px] hover:bg-[#f4f2ee]"
            >
              {profile?.handle ? "내 프로필 보기" : "프로필 완성하기"}
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left text-[13.5px] text-[#b64a3f] px-[8px] py-[9px] rounded-[5px] hover:bg-[#f7ecea] cursor-pointer"
            >
              로그아웃
            </button>
          </div>
        )}
      </header>

      {/* ============ MOBILE TOP HEADER ============ */}
      <header className="flex lg:hidden flex-none items-center justify-between h-[52px] px-[16px] border-b border-[#e8e7e3] bg-white z-20">
        <Link href="/" className="flex items-center gap-[8px]">
          <LogoMark className="w-[24px] h-[24px]" />
          <span className="font-bold text-[15px] tracking-[-0.02em]">나누다</span>
        </Link>
        <div className="flex items-center gap-[2px]">
          <Link href="/archive" aria-label="검색" className="p-[6px] text-[#0e0e0e]">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M21 21l-4.3-4.3"></path>
            </svg>
          </Link>
          <Link href="/editor" aria-label="글쓰기" className="p-[6px] text-[#0e0e0e]">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>
            </svg>
          </Link>
          {loading && (
            <span className="ml-[2px] w-[27px] h-[27px] rounded-full bg-[#efeee9] animate-pulse" aria-hidden />
          )}
          {!loading && !loggedIn && (
            <Link href="/login" aria-label="로그인" className="p-[6px] text-[#0e0e0e]">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 20.5v-.5a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v.5"></path>
              </svg>
            </Link>
          )}
          {loggedIn && (
            <span className="ml-[2px]" aria-label="로그인됨">
              <Avatar src={profile?.photoURL} name={avatarName} size={27} />
            </span>
          )}
        </div>
      </header>
    </>
  );
}
