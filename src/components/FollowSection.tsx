"use client";

import { useState } from "react";
import Link from "next/link";
import { FollowButton } from "./FollowButton";

/**
 * Wraps the 팔로잉/팔로워 counts and the FollowButton together so a follow/unfollow click can bump
 * the follower count shown right here, without a live Firestore subscription — per the project's
 * explicit choice: update once on the action itself, refresh for real only on a fresh page load.
 */
export function FollowSection({
  authorId,
  handle,
  initialFollowingCount,
  initialFollowersCount,
}: {
  authorId: string;
  handle: string;
  initialFollowingCount: number;
  initialFollowersCount: number;
}) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);

  return (
    <div className="flex items-center gap-[10px] text-[12.5px] text-[#8a887f]">
      <Link href={`/profile/${handle}/following`} className="hover:text-[#0e0e0e]">
        팔로잉 <span className="font-mono">{initialFollowingCount}</span>
      </Link>
      <Link href={`/profile/${handle}/followers`} className="hover:text-[#0e0e0e]">
        팔로워 <span className="font-mono">{followersCount}</span>
      </Link>
      <FollowButton
        authorId={authorId}
        onToggle={(nowFollowing) => setFollowersCount((c) => c + (nowFollowing ? 1 : -1))}
      />
    </div>
  );
}
