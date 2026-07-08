import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUserByHandle } from "@/lib/users";
import { getPostsByAuthor } from "@/lib/posts";
import { getFollowCounts } from "@/lib/follows";
import { CoverImage } from "@/components/CoverImage";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileWelcomeTutorial } from "@/components/ProfileWelcomeTutorial";
import { formatDate } from "@/lib/date";
import type { Post } from "@/lib/types";

/** Photo-less posts (any category, not just 일상) get the same title/excerpt/date-readtime layout
 * as a photo card, just without the image-shaped box — mirrors /daily's TextOnlyCard treatment
 * (see that file's comment for why: a generic placeholder box reads as a broken image for a post
 * that never had one). */
function PostCard({ post }: { post: Post }) {
  if (!post.coverImageURL) {
    return (
      // `flex-1` fills the grid row's stretched height (CSS Grid's default align-items:stretch)
      // since this is the Link's only child when there's no cover image; `mt-auto` on the date
      // then pins it to the bottom, lining up with a photo card's date in the same row.
      <div className="flex-1 flex flex-col gap-[6px]">
        <span className="text-[17px] font-semibold tracking-[-0.01em] leading-[1.25]">{post.title}</span>
        <span className="text-[13px] text-[#77756c] leading-[1.55] line-clamp-4">{post.excerpt}</span>
        <span className="text-[11.5px] text-[#b0aea6] mt-auto pt-[2px]">
          {formatDate(post.publishedAt)} · {post.readTime}
        </span>
      </div>
    );
  }
  return (
    <>
      <CoverImage src={post.coverImageURL} alt={post.title} aspectRatio="4/3" placeholderLabel="post" />
      {/* flex-1 + mt-auto on the date: pins it to the bottom of the grid row's stretched height
          regardless of excerpt length, so a photo-less card's date lines up with a photo card's —
          see the identical pattern (and rationale) in /daily/page.tsx's TextOnlyCard. */}
      <span className="flex-1 flex flex-col gap-[6px]">
        <span className="text-[17px] font-semibold tracking-[-0.01em] leading-[1.25]">{post.title}</span>
        <span className="text-[13px] text-[#77756c] leading-[1.55] line-clamp-4">{post.excerpt}</span>
        <span className="text-[11.5px] text-[#b0aea6] mt-auto pt-[2px]">
          {formatDate(post.publishedAt)} · {post.readTime}
        </span>
      </span>
    </>
  );
}

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
      <section className="px-6 max-w-[900px] mx-auto">
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
                  <PostCard post={post} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
