import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUserByHandle } from "@/lib/users";
import { getPostsByAuthor } from "@/lib/posts";
import { getFollowCounts } from "@/lib/follows";
import { CoverImage } from "@/components/CoverImage";
import { Avatar } from "@/components/Avatar";
import { ProfileEditButton } from "@/components/ProfileEditButton";
import { FollowButton } from "@/components/FollowButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { ProfileWelcomeTutorial } from "@/components/ProfileWelcomeTutorial";
import { formatDate } from "@/lib/date";

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
  const hasLinks = Boolean(links.website || links.instagram || links.twitter);

  return (
    <>
      <div
        className="h-[160px] sm:h-[220px] w-full bg-[#efeee9] bg-cover bg-center"
        style={user.coverURL ? { backgroundImage: `url(${user.coverURL})` } : undefined}
      />
      <section className="px-6 max-w-[900px] mx-auto">
        <div className="flex items-center gap-[16px] pt-[20px] pb-[18px]">
          <Avatar
            src={user.photoURL}
            name={user.displayName}
            size={84}
            className="border-[3px] border-white shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
          />
          <div className="flex flex-col gap-[4px]">
            <span className="text-[21px] font-bold tracking-[-0.02em]">{user.displayName || "이름 없음"}</span>
            <span className="font-mono text-[13px] text-[#8a887f]">@{handle}</span>
            <div className="flex items-center gap-[10px] text-[12.5px] text-[#8a887f]">
              <Link href={`/profile/${handle}/following`} className="hover:text-[#0e0e0e]">
                팔로잉 <span className="font-mono">{followCounts.following}</span>
              </Link>
              <Link href={`/profile/${handle}/followers`} className="hover:text-[#0e0e0e]">
                팔로워 <span className="font-mono">{followCounts.followers}</span>
              </Link>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-[8px]">
            <FollowButton authorId={user.uid} />
            {Boolean(user.subscriptionPrice) && (
              <SubscribeButton authorId={user.uid} authorName={user.displayName} price={user.subscriptionPrice!} />
            )}
            <ProfileEditButton uid={user.uid} />
          </div>
        </div>

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
            {links.twitter && (
              <a
                href={links.twitter}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[12.5px] text-[#54524c] border border-[#e5e3de] bg-[#f2f0ec] px-[10px] py-[5px] rounded-[2px]"
              >
                Twitter / X
              </a>
            )}
          </div>
        )}

        <div className="border-t border-[#e8e7e3] pt-[22px] pb-[50px]">
          {posts.length === 0 ? (
            <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>
          ) : (
            <div className="grid gap-[30px] [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="text-left flex flex-col gap-[12px] text-[#0e0e0e]"
                >
                  <CoverImage
                    src={post.coverImageURL}
                    alt={post.title}
                    aspectRatio="4/3"
                    placeholderLabel="post"
                  />
                  <span className="flex flex-col gap-[6px]">
                    <span className="text-[17px] font-semibold tracking-[-0.01em] leading-[1.25]">
                      {post.title}
                    </span>
                    <span className="text-[13px] text-[#77756c] leading-[1.55]">{post.excerpt}</span>
                    <span className="text-[11.5px] text-[#b0aea6] mt-[2px]">
                      {formatDate(post.publishedAt)} · {post.readTime}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
