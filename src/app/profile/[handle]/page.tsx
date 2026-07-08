import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUserByHandle } from "@/lib/users";
import { getPostsByAuthor } from "@/lib/posts";
import { getFollowCounts } from "@/lib/follows";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileWelcomeTutorial } from "@/components/ProfileWelcomeTutorial";
import { ProfilePostList } from "./ProfilePostList";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const user = await getUserByHandle(handle);
  if (!user) return { title: "프로필을 찾을 수 없습니다 · 나누다" };
  return { title: `${user.displayName || `@${handle}`} · 나누다` };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getUserByHandle(handle);
  if (!user) notFound();

  const posts = await getPostsByAuthor(user.uid);
  const followCounts = await getFollowCounts(user.uid);
  const links = user.links ?? {};
  const hasLinks = Boolean(links.website || links.instagram);

  return (
    <>
      <div
        className="h-[160px] sm:h-[220px] w-full bg-[#efeee9] bg-cover bg-center"
        style={user.coverURL ? { backgroundImage: `url(${user.coverURL})` } : undefined}
      />
      <section className="px-6 max-w-[1120px] mx-auto">
        <ProfileHeader
          uid={user.uid}
          handle={handle}
          displayName={user.displayName}
          photoURL={user.photoURL}
          subscriptionPrice={user.subscriptionPrice}
          initialFollowingCount={followCounts.following}
          initialFollowersCount={followCounts.followers}
        />

        <Suspense fallback={null}>
          <ProfileWelcomeTutorial />
        </Suspense>

        {user.bio && <p className="text-[15px] text-[#2c2a26] leading-[1.7] mb-[14px] max-w-[60ch]">{user.bio}</p>}

        {hasLinks && (
          <div className="flex flex-wrap gap-[10px] mb-[26px]">
            {links.website && (
              <a
                href={links.website}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[12.5px] text-[#54524c] border border-[#e5e3de] bg-[#f2f0ec] px-[10px] py-[5px] rounded-[2px]"
              >
                웹사이트
              </a>
            )}
            {links.instagram && (
              <a
                href={links.instagram}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[12.5px] text-[#54524c] border border-[#e5e3de] bg-[#f2f0ec] px-[10px] py-[5px] rounded-[2px]"
              >
                Instagram
              </a>
            )}
          </div>
        )}

        <div className="border-t border-[#e8e7e3] pt-[22px] pb-[50px]">
          <ProfilePostList posts={posts} />
        </div>
      </section>
    </>
  );
}
