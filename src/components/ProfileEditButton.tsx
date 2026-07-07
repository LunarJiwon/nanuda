"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";

/**
 * Only renders on the profile owner's own /profile/[handle] view — everyone else sees nothing.
 * Server Component pages can't check auth state themselves, so this is a small client island.
 */
export function ProfileEditButton({ uid, className = "" }: { uid: string; className?: string }) {
  const { user } = useAuth();
  if (user?.uid !== uid) return null;

  return (
    <Link
      href="/profile/edit"
      className={`text-[13px] font-medium text-[#0e0e0e] border border-[#e0ded8] bg-white px-[14px] py-[8px] rounded-[3px] whitespace-nowrap ${className}`}
    >
      프로필 편집
    </Link>
  );
}
