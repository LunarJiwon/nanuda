import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostById } from "@/lib/posts";
import { getUserById } from "@/lib/users";
import { CATEGORY_LABEL } from "@/lib/types";
import { formatDate } from "@/lib/date";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { PostBody } from "@/components/PostBody";
import { PremiumPostBody } from "@/components/PremiumPostBody";
import { TagChip } from "@/components/TagChip";
import { LikeButton } from "@/components/LikeButton";
import { PostActions } from "@/components/PostActions";
import { SupportButton } from "@/components/SupportButton";
import { ViewTracker } from "@/components/ViewTracker";
import { CommentSection } from "@/components/comments/CommentSection";

export const revalidate = 60;

function extractH2Headings(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, "").trim());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return { title: "게시글을 찾을 수 없습니다 · 나누다" };

  const url = `/post/${id}`;
  const title = `${post.title} · 나누다`;
  // A 구독자 전용 post's excerpt is still derived from the full body (see buildPostPayload in the
  // editor), so it's a safe public teaser even though the body itself is gated.
  const description = post.excerpt || post.subtitle || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      images: post.coverImageURL ? [{ url: post.coverImageURL }] : undefined,
    },
    twitter: {
      card: post.coverImageURL ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.coverImageURL ? [post.coverImageURL] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  // Missing handle = no public profile yet (e.g. pre-handle accounts) — same "treat as no link"
  // convention as Header.tsx's profile dropdown and users.ts.
  const author = await getUserById(post.authorId);
  const authorHandle = author?.handle;

  const isArt = post.category === "art";
  const isQuote = post.category === "quote";
  const isDaily = post.category === "daily";
  const isInfo = post.category === "info";
  const headings = isInfo ? extractH2Headings(post.content) : [];

  // Escaping "<" keeps a post title/excerpt containing literal "</script>" from breaking out of
  // this script tag — everything else here is either our own data or already-safe JSON syntax.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.subtitle || undefined,
    image: post.coverImageURL ? [post.coverImageURL] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.authorName },
    mainEntityOfPage: `https://nanuda.life/post/${post.id}`,
  }).replace(/</g, "\\u003c");

  return (
    <article className={`px-6 pt-10 pb-16 mx-auto ${isArt ? "max-w-[880px]" : "max-w-[720px]"}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ViewTracker postId={post.id} />
      <div className="flex items-center justify-between pb-6">
        <Link href={`/${post.category}`} className="inline-flex items-center gap-[6px] text-[13px] text-[#8a887f]">
          ← {CATEGORY_LABEL[post.category]}로 돌아가기
        </Link>
        <PostActions postId={post.id} authorId={post.authorId} category={post.category} />
      </div>

      {isArt && (
        <>
          {/* Title leads, then every photo attached shows inline in the body in order (no single
              image pulled out as a "cover" anymore — that hid everything past the first photo on
              a multi-photo post), and the author/engagement row moves below all of it. */}
          <h1 className="font-bold text-[28px] leading-[1.15] tracking-[-0.03em] mb-[8px]">{post.title}</h1>
          {post.subtitle && <p className="text-[13px] text-[#8a887f] mb-[20px]">{post.subtitle}</p>}

          {post.visibility === "subscribers" ? (
            <PremiumPostBody
              postId={post.id}
              authorId={post.authorId}
              authorName={post.authorName}
              price={author?.subscriptionPrice ?? 0}
            />
          ) : (
            post.content && <PostBody content={post.content} />
          )}

          <div className="flex items-center gap-[10px] mt-[26px] pt-[20px] border-t border-[#e8e7e3]">
            {authorHandle ? (
              <Link
                href={`/profile/${authorHandle}`}
                className="inline-flex items-center gap-[7px] text-[14.5px] font-medium text-[#54524c] hover:text-[#0e0e0e]"
              >
                <Avatar src={author?.photoURL} name={post.authorName} size={26} />
                {post.authorName}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-[7px] text-[14.5px] font-medium text-[#54524c]">
                <Avatar src={author?.photoURL} name={post.authorName} size={26} />
                {post.authorName}
              </span>
            )}
            <span className="text-[12px] text-[#8a887f]">
              조회 <span className="font-mono">{post.viewCount}</span>
            </span>
            <div className="ml-auto flex items-center gap-[10px]">
              <LikeButton postId={post.id} initialLikeCount={post.likeCount} authorId={post.authorId} />
              <SupportButton
                postId={post.id}
                postTitle={post.title}
                authorId={post.authorId}
                authorName={post.authorName}
              />
            </div>
          </div>
        </>
      )}

      {isQuote && (
        <div className="pt-6 pb-2 text-center">
          <div className="text-[64px] leading-[0.5] text-[#d5d1c8]">&ldquo;</div>
          <h1 className="font-semibold text-[clamp(24px,4vw,34px)] leading-[1.5] tracking-[-0.02em] mt-[18px] mb-[20px] text-balance">
            {post.title}
          </h1>
          <p className="text-[14px] text-[#8a887f] m-0">— {post.excerpt}</p>
          <div className="flex items-center justify-center gap-[10px] mt-[18px]">
            <LikeButton postId={post.id} initialLikeCount={post.likeCount} authorId={post.authorId} />
            <SupportButton
              postId={post.id}
              postTitle={post.title}
              authorId={post.authorId}
              authorName={post.authorName}
            />
            <span className="text-[12px] text-[#8a887f]">
              조회 <span className="font-mono">{post.viewCount}</span>
            </span>
          </div>
        </div>
      )}

      {(isDaily || isInfo) && (
        <>
          <h1 className="font-bold text-[clamp(28px,4.4vw,42px)] leading-[1.15] tracking-[-0.035em] mb-[14px] text-balance">
            {post.title}
          </h1>
          <div className="flex flex-wrap gap-[8px] items-center text-[12.5px] text-[#8a887f] border-b border-[#e8e7e3] pb-[22px]">
            {authorHandle ? (
              <Link href={`/profile/${authorHandle}`} className="inline-flex items-center gap-[6px] hover:text-[#0e0e0e]">
                <Avatar src={author?.photoURL} name={post.authorName} size={22} />
                {post.authorName}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-[6px]">
                <Avatar src={author?.photoURL} name={post.authorName} size={22} />
                {post.authorName}
              </span>
            )}
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readTime}</span>
            <span>·</span>
            <span>
              조회 <span className="font-mono">{post.viewCount}</span>
            </span>
            {post.tags.map((tag) => (
              <TagChip key={tag} tag={tag} size="sm" />
            ))}
            <div className="ml-auto flex items-center gap-[10px]">
              <LikeButton postId={post.id} initialLikeCount={post.likeCount} authorId={post.authorId} />
              <SupportButton
                postId={post.id}
                postTitle={post.title}
                authorId={post.authorId}
                authorName={post.authorName}
              />
            </div>
          </div>

          {isDaily && post.coverImageURL && (
            <figure className="my-[26px]">
              <CoverImage
                src={post.coverImageURL}
                alt={post.title}
                aspectRatio="3/2"
                placeholderLabel="photo"
              />
            </figure>
          )}

          {isInfo && headings.length > 0 && (
            <div className="my-[26px] border border-[#e8e7e3] bg-[#faf9f7] rounded-[3px] px-[18px] py-[16px]">
              <div className="text-[11px] text-[#9a988f] mb-[8px] font-semibold">목차 · TOC</div>
              <div className="flex flex-col gap-[5px] text-[13.5px]">
                {headings.map((h, i) => (
                  <span key={i} className="text-[#2c2a26]">
                    {i + 1}. {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-[22px]">
            {post.visibility === "subscribers" ? (
              <PremiumPostBody
                postId={post.id}
                authorId={post.authorId}
                authorName={post.authorName}
                price={author?.subscriptionPrice ?? 0}
              />
            ) : (
              <PostBody content={post.content} />
            )}
          </div>
        </>
      )}

      <CommentSection postId={post.id} postAuthorId={post.authorId} />
    </article>
  );
}
