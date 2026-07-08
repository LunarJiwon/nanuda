import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostById } from "@/lib/posts";
import { getUserById } from "@/lib/users";
import { CATEGORY_LABEL } from "@/lib/types";
import { formatDate } from "@/lib/date";
import { CoverImage } from "@/components/CoverImage";
import { PostBody } from "@/components/PostBody";
import { TagChip } from "@/components/TagChip";
import { LikeButton } from "@/components/LikeButton";
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
  return {
    title: `${post.title} · 나누다`,
    description: post.excerpt,
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

  return (
    <article className="px-6 pt-10 pb-16 max-w-[720px] mx-auto">
      <ViewTracker postId={post.id} />
      <Link
        href={`/${post.category}`}
        className="inline-flex items-center gap-[6px] text-[13px] text-[#8a887f] pb-6"
      >
        ← {CATEGORY_LABEL[post.category]}로 돌아가기
      </Link>

      {isArt && (
        <>
          <div className="bg-white p-[22px] border border-[#d8d4cc] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.3)] mb-[22px]">
            <CoverImage
              src={post.coverImageURL}
              alt={post.title}
              aspectRatio={post.ratio || "1/1"}
              placeholderLabel={post.subtitle || "artwork"}
              colorA="#e4e2dc"
              colorB="#eeece7"
              className="min-w-[150px] !border-0 text-[12px] text-[#a9a79e]"
            />
          </div>
          <h1 className="font-bold text-[30px] leading-[1.15] tracking-[-0.03em] mb-[8px]">{post.title}</h1>
          <p className="text-[12px] text-[#8a887f] mb-[14px]">{post.excerpt}</p>
          <div className="flex items-center gap-[10px] mb-6">
            <LikeButton postId={post.id} initialLikeCount={post.likeCount} />
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
            <LikeButton postId={post.id} initialLikeCount={post.likeCount} />
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
                <span className="w-[22px] h-[22px] rounded-full bg-[#0e0e0e] text-white flex items-center justify-center text-[10px] font-semibold">
                  {(post.authorName || "나").charAt(0)}
                </span>
                {post.authorName}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-[6px]">
                <span className="w-[22px] h-[22px] rounded-full bg-[#0e0e0e] text-white flex items-center justify-center text-[10px] font-semibold">
                  {(post.authorName || "나").charAt(0)}
                </span>
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
            <LikeButton postId={post.id} initialLikeCount={post.likeCount} />
            <SupportButton
              postId={post.id}
              postTitle={post.title}
              authorId={post.authorId}
              authorName={post.authorName}
            />
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
            <PostBody content={post.content} />
          </div>
        </>
      )}

      <CommentSection postId={post.id} />
    </article>
  );
}
