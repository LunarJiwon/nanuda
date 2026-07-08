"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { FollowButton } from "./FollowButton";
import { SubscribeButton } from "./SubscribeButton";
import { ProfileEditButton } from "./ProfileEditButton";

/**
 * The avatar/name/counts row at the top of /profile/[handle], plus the follow/subscribe/edit
 * action buttons — all in one Client Component so a follow/unfollow click can bump the follower
 * count shown on the left without a live Firestore subscription, even though the action button
 * itself sits on the right (per the confirmed layout: actions grouped together on the right).
 */
export function ProfileHeader({
  uid,
  handle,
  displayName,
  photoURL,
  subscriptionPrice,
  initialFollowingCount,
  initialFollowersCount,
}: {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string | null;
  subscriptionPrice?: number;
  initialFollowingCount: number;
  initialFollowersCount: number;
}) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);

  return (
    <div className="flex items-center gap-[16px] pt-[20px] pb-[18px]">
      <Avatar
        src={photoURL}
        name={displayName}
        size={84}
        className="border-[3px] border-white shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
      />
      <div className="flex flex-col gap-[4px]">
        <span className="text-[21px] font-bold tracking-[-0.02em]">{displayName || "이름 없음"}</span>
        <span className="font-mono text-[13px] text-[#8a887f]">@{handle}</span>
        <div className="flex items-center gap-[10px] text-[12.5px] text-[#8a887f]">
          <Link href={`/profile/${handle}/following`} className="hover:text-[#0e0e0e]">
            팔로잉 <span className="font-mono">{initialFollowingCount}</span>
          </Link>
          <Link href={`/profile/${handle}/followers`} className="hover:text-[#0e0e0e]">
            팔로워 <span className="font-mono">{followersCount}</span>
          </Link>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-[8px]">
        <FollowButton
          authorId={uid}
          onToggle={(nowFollowing) => setFollowersCount((c) => c + (nowFollowing ? 1 : -1))}
        />
        {Boolean(subscriptionPrice) && (
          <SubscribeButton authorId={uid} authorName={displayName} price={subscriptionPrice!} />
        )}
        <ProfileEditButton uid={uid} />
      </div>
    </div>
  );
}
