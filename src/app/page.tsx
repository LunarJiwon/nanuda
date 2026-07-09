import Link from "next/link";
import type { Metadata } from "next";
import { FadeInImage } from "@/components/FadeInImage";
import { RotatingWord } from "@/components/RotatingWord";
import { AuthorByline } from "@/components/AuthorByline";
import { getPopularPosts, getRecentPosts } from "@/lib/posts";
import { getUsersByIds } from "@/lib/users";
import { CATEGORY_LABEL } from "@/lib/types";
import { formatDate } from "@/lib/date";
import type { AppUser, Post } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

function PostCard({ post, author }: { post: Post; author?: AppUser }) {
  return (
    <Link
      href={`/post/${post.id}`}
      className="text-left border-t border-[#eeece8] py-[18px] flex flex-col gap-[7px] text-[#0e0e0e]"
    >
      <span className="text-[17px] font-semibold tracking-[-0.01em] leading-[1.3]">{post.title}</span>
      <span className="text-[12.5px] text-[#77756c] leading-[1.55]">{post.excerpt}</span>
      <AuthorByline name={post.authorName} photoURL={author?.photoURL ?? null} size={16} />
      <span className="text-[11.5px] text-[#b0aea6]">
        {CATEGORY_LABEL[post.category]} · {formatDate(post.publishedAt)}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const [recentPosts, popularPosts] = await Promise.all([getRecentPosts(), getPopularPosts()]);
  const authors = await getUsersByIds([...recentPosts, ...popularPosts].map((p) => p.authorId));

  return (
    <>
      <section className="px-6 pt-16 pb-10 max-w-[1120px] mx-auto">
        <h1 className="font-bold text-[clamp(32px,5vw,60px)] leading-[1.2] tracking-[-0.035em] mb-[22px]">
          우리의 <RotatingWord /> 나누는 공간
        </h1>
        <p className="text-[16px] leading-[1.7] text-[#54524c] max-w-[54ch] m-0">
          틀을 벗어나 우리의 일상을, 정보를, 예술을 한 공간에 나누다.
        </p>
      </section>

      <section className="px-6 py-2 max-w-[1120px] mx-auto">
        <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          <Link
            href="/daily"
            className="relative overflow-hidden text-left border border-[#e8e7e3] bg-[#faf9f7] px-[22px] py-[24px] rounded-[3px] flex flex-col min-h-[210px] text-[#0e0e0e]"
          >
            <FadeInImage
              src="/images/home/daily.jpg"
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 280px"
              className="object-cover"
              skeletonClassName="bg-[#f2f0ec]"
            />
            <div className="absolute inset-0 bg-[#faf9f7]/[0.72]" />
            <span className="relative text-[28px] font-bold tracking-[-0.03em] leading-none">일상</span>
            <span className="relative text-[13.5px] text-[#6b695f] mt-[12px] leading-[1.6]">
              사진과 글에 집중한, 조용한 기록의 방.
            </span>
            <span className="relative mt-auto text-[12.5px] text-[#0e0e0e] pt-[20px]">들어가기 →</span>
          </Link>
          <Link
            href="/info"
            className="relative overflow-hidden text-left border border-[#1c1c1c] bg-[#141414] text-[#f2f2f2] px-[22px] py-[24px] rounded-[3px] flex flex-col min-h-[210px]"
          >
            <FadeInImage
              src="/images/home/info.jpg"
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 280px"
              className="object-cover"
              skeletonClassName="bg-[#232323]"
            />
            <div className="absolute inset-0 bg-[#141414]/[0.72]" />
            <span className="relative text-[28px] font-bold tracking-[-0.03em] leading-none">정보</span>
            <span className="relative text-[13px] text-[#9c9c9c] mt-[12px] leading-[1.6]">code · 회로 · 수식</span>
            <span className="relative mt-auto text-[12.5px] text-[#f2f2f2] pt-[20px]">들어가기 →</span>
          </Link>
          <Link
            href="/art"
            className="relative overflow-hidden text-left border border-[#e8e7e3] bg-[#f4f2ee] px-[22px] py-[24px] rounded-[3px] flex flex-col min-h-[210px] text-[#0e0e0e]"
          >
            <FadeInImage
              src="/images/home/art.jpg"
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 280px"
              className="object-cover"
              skeletonClassName="bg-[#e9e7e1]"
            />
            <div className="absolute inset-0 bg-[#f4f2ee]/[0.68]" />
            <span className="relative text-[28px] font-bold tracking-[-0.03em] leading-none">예술</span>
            <span className="relative text-[13.5px] text-[#6b695f] mt-[10px] leading-[1.6]">
              벽에 걸린 한 점, 전시장의 방.
            </span>
            <span className="relative mt-auto text-[12.5px] text-[#0e0e0e] pt-[20px]">들어가기 →</span>
          </Link>
          <Link
            href="/quote"
            className="relative overflow-hidden text-left border border-[#e8e7e3] bg-[#faf9f7] px-[22px] py-[24px] rounded-[3px] flex flex-col min-h-[210px] text-[#0e0e0e]"
          >
            <FadeInImage
              src="/images/home/quote.jpg"
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 280px"
              className="object-cover"
              skeletonClassName="bg-[#f2f0ec]"
            />
            <div className="absolute inset-0 bg-[#faf9f7]/[0.62]" />
            <span className="relative text-[40px] leading-[0.7] text-[#c9c5bc]">&ldquo;</span>
            <span className="relative text-[28px] font-bold tracking-[-0.03em] leading-none mt-[8px]">글귀</span>
            <span className="relative text-[13.5px] text-[#6b695f] mt-[10px] leading-[1.6]">
              마음에 남은 문장, 카드 한 장으로.
            </span>
            <span className="relative mt-auto text-[12.5px] text-[#0e0e0e] pt-[20px]">들어가기 →</span>
          </Link>
        </div>
      </section>

      {popularPosts.length > 0 && (
        <section className="px-6 pt-[44px] pb-8 max-w-[1120px] mx-auto">
          <div className="flex items-baseline justify-between border-b border-[#e8e7e3] pb-[14px] mb-[6px]">
            <h2 className="text-[20px] font-bold tracking-[-0.02em] m-0">인기 있는 게시물</h2>
          </div>
          <div className="grid gap-x-6 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {popularPosts.map((post) => (
              <PostCard key={post.id} post={post} author={authors.get(post.authorId)} />
            ))}
          </div>
        </section>
      )}

      <section className="px-6 pt-[44px] pb-8 max-w-[1120px] mx-auto">
        <div className="flex items-baseline justify-between border-b border-[#e8e7e3] pb-[14px] mb-[6px]">
          <h2 className="text-[20px] font-bold tracking-[-0.02em] m-0">새로운 게시물</h2>
          <Link href="/archive" className="text-[13px] text-[#9a988f]">
            전체 보기 →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>
        ) : (
          <div className="grid gap-x-6 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} author={authors.get(post.authorId)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
